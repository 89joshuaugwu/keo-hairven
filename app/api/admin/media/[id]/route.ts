import { trashRecord, purgeRecord } from "@/lib/trash-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { destroyCloudinaryAsset } from "@/lib/cloudinary-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { getMediaReferences, getPersistedMedia, logMediaAdminAction, mediaLibraryFromDoc } from "@/lib/admin-media";

export const runtime = "nodejs";
const allowedProvenance = new Set(["real-work", "inspiration", "campaign", "actual-product", "service-media", "business-evidence"]);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const media = await getPersistedMedia(id);
  if (!media) return noStoreJson({ code: "not-found", message: "Media not found." }, { status: 404 });
  return noStoreJson({ media });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  let body: { expectedRevision?: number; alt?: string; caption?: string; provenance?: string; generated?: boolean; consentConfirmed?: boolean; actualItem?: boolean; focal?: { x?: number; y?: number } } = {};
  try { body = await request.json(); } catch { /* validation below */ }
  const ref = db.collection("media").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return noStoreJson({ code: "not-found", message: "Media not found." }, { status: 404 });
  const current = mediaLibraryFromDoc(snap.id, snap.data() || {});
  if (Number.isInteger(body.expectedRevision) && body.expectedRevision !== current.revision) {
    return noStoreJson({ code: "revision-conflict", message: "This media item changed in another session. Refresh and try again." }, { status: 409 });
  }

  const provenance = typeof body.provenance === "string" && allowedProvenance.has(body.provenance) ? body.provenance : current.provenance;
  const generated = provenance === "actual-product" ? false : (typeof body.generated === "boolean" ? body.generated : current.generated);
  const consentConfirmed = typeof body.consentConfirmed === "boolean" ? body.consentConfirmed : current.consentConfirmed;
  if (provenance === "real-work" && !consentConfirmed) return noStoreJson({ code: "permission", message: "Confirm permission before labelling media as KEO Hairven’s real work." }, { status: 400 });

  const update: Record<string, unknown> = {
    provenance,
    generated,
    consentConfirmed,
    revision: current.revision + 1,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof body.alt === "string") update.alt = body.alt.trim().slice(0, 300);
  if (typeof body.caption === "string") update.caption = body.caption.trim().slice(0, 500);
  update.actualItem = provenance === "actual-product";
  if (body.focal && Number.isFinite(body.focal.x) && Number.isFinite(body.focal.y)) {
    update.focal = {
      x: Math.max(0, Math.min(1, Number(body.focal.x))),
      y: Math.max(0, Math.min(1, Number(body.focal.y))),
    };
  }
  await ref.update(update);
  await logMediaAdminAction(auth.session.email, "media.update", id);
  const refreshed = await ref.get();
  return noStoreJson({ ok: true, media: mediaLibraryFromDoc(refreshed.id, refreshed.data() || {}) });
}

export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi(request,true);if("response" in auth)return auth.response;const {id}=await context.params;
 let body:{expectedRevision?:number}={};try{body=await request.json();}catch{}
 try{if(request.nextUrl.searchParams.get("purge")==="1"){if(auth.session.role!=="owner")return noStoreJson({message:"Owner access required."},{status:403});const result=await purgeRecord("media",id,{actor:auth.session.email||"admin",expectedRevision:body.expectedRevision,onlyExpired:false});if(result!=="deleted")throw Error("Deletion blocked or pending. Refresh and check references.");return noStoreJson({ok:true,purged:true});}

 return noStoreJson({ok:true,...await trashRecord("media",id,body.expectedRevision,auth.session.email||"admin")});
 }catch(e){return noStoreJson({message:e instanceof Error?e.message:"Trash action failed."},{status:409});}
}

import { validateMediaAssignment } from "@/lib/categories-server";
import { trashRecord, purgeRecord } from "@/lib/trash-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminService, getAdminServiceMedia, logServiceAdminAction, serviceDraftPayload, type AdminServiceRecord } from "@/lib/admin-services";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const service = await getAdminService(id);
  if (!service) return noStoreJson({ code: "not-found", message: "Service not found." }, { status: 404 });
  const media = service.preview ? [] : await getAdminServiceMedia(service.mediaIds);
  return noStoreJson({ service, media });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  let body: Partial<AdminServiceRecord> & { expectedRevision?: number } = {};
  try { body = await request.json(); } catch { /* validated below */ }
  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return noStoreJson({ code: "revision-required", message: "Refresh the editor and try again." }, { status: 400 });
  const payload = serviceDraftPayload(body);
  if (!payload.title) return noStoreJson({ code: "validation", message: "Add a service title before saving.", fieldErrors: { title: "Service title is required." } }, { status: 400 });
  const ref = db.collection("services").doc(id);
  try {
    const revision = await db.runTransaction(async (transaction) => {
      await validateMediaAssignment(transaction,payload.mediaIds);
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error("not-found");
      const current = snap.data() || {};
      if(current.status==="trashed"||current.purgeClaim)throw Error("Restore this item before editing.");
      if (current.revision !== expectedRevision) throw Object.assign(new Error("revision-conflict"), { currentRevision: current.revision });
      const next = expectedRevision + 1;
      transaction.update(ref, { ...payload, revision: next, updatedAt: FieldValue.serverTimestamp() });
      return next;
    });
    await logServiceAdminAction(auth.session.email, "service.update", id);
    return noStoreJson({ ok: true, id, revision });
  } catch (caught) {
    const error = caught as Error & { currentRevision?: number };
    if (error.message === "not-found") return noStoreJson({ code: "not-found", message: "Service not found." }, { status: 404 });
    if (error.message === "revision-conflict") return noStoreJson({ code: "revision-conflict", message: "This service changed in another tab. Refresh before saving again.", currentRevision: error.currentRevision }, { status: 409 });
    return noStoreJson({ code: "save-failed", message: "The service draft could not be saved. Try again." }, { status: 500 });
  }
}

export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi(request,true);if("response" in auth)return auth.response;const {id}=await context.params;
 let body:{expectedRevision?:number}={};try{body=await request.json();}catch{}
 try{if(request.nextUrl.searchParams.get("purge")==="1"){if(auth.session.role!=="owner")return noStoreJson({message:"Owner access required."},{status:403});const result=await purgeRecord("services",id,{actor:auth.session.email||"admin",expectedRevision:body.expectedRevision,onlyExpired:false});if(result!=="deleted")throw Error("Deletion blocked or pending. Refresh and check references.");return noStoreJson({ok:true,purged:true});}
 if(!Number.isInteger(body.expectedRevision))throw Error("Refresh before moving this item to Trash.");
 return noStoreJson({ok:true,...await trashRecord("services",id,body.expectedRevision,auth.session.email||"admin")});
 }catch(e){return noStoreJson({message:e instanceof Error?e.message:"Trash action failed."},{status:409});}
}

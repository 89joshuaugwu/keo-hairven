import { trashRecord, purgeRecord } from "@/lib/trash-server";
import { validateCategoryAssignment, validateMediaAssignment } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { draftPayload, getAdminProduct, logAdminAction, type AdminProductRecord } from "@/lib/admin-products";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const product = await getAdminProduct(id);
  if (!product) return noStoreJson({ code: "not-found", message: "Product not found." }, { status: 404 });
  return noStoreJson({ product });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;

  let body: (Partial<AdminProductRecord> & { expectedRevision?: number }) = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return noStoreJson({ code: "revision-required", message: "Refresh the editor and try again." }, { status: 400 });
  const payload = draftPayload(body);
  if (!payload.title) return noStoreJson({ code: "validation", message: "Add a product name before saving.", fieldErrors: { title: "Product name is required." } }, { status: 400 });

  const ref = db.collection("products").doc(id);
  try {
    const newRevision = await db.runTransaction(async (transaction) => {
      await validateCategoryAssignment(transaction,"products",payload.category);
      await validateMediaAssignment(transaction,payload.mediaIds);
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error("not-found");
      const current = snap.data() || {};
      if(current.status === "trashed" || current.purgeClaim) throw Error("Restore this item before editing.");
      if (current.revision !== expectedRevision) {
        const error = new Error("revision-conflict") as Error & { currentRevision?: number };
        error.currentRevision = current.revision;
        throw error;
      }
      const nextRevision = expectedRevision + 1;
      transaction.update(ref, { ...payload, revision: nextRevision, updatedAt: FieldValue.serverTimestamp() });
      return nextRevision;
    });
    await logAdminAction(auth.session.email, "product.update", id);
    return noStoreJson({ ok: true, id, revision: newRevision });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "";
    if(message.startsWith("Choose an existing category")||message.includes("Selected media")||message.startsWith("Restore this item"))return noStoreJson({message},{status:409});
    if (message === "not-found") return noStoreJson({ code: "not-found", message: "Product not found." }, { status: 404 });
    if (message === "revision-conflict") {
      return noStoreJson({ code: "revision-conflict", message: "This product changed in another tab. Refresh before saving again.", currentRevision: (caught as Error & { currentRevision?: number }).currentRevision }, { status: 409 });
    }
    return noStoreJson({ code: "save-failed", message: "The draft could not be saved. Try again." }, { status: 500 });
  }
}

export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi(request,true);if("response" in auth)return auth.response;const {id}=await context.params;
 let body:{expectedRevision?:number}={};try{body=await request.json();}catch{}
 try{if(request.nextUrl.searchParams.get("purge")==="1"){if(auth.session.role!=="owner")return noStoreJson({message:"Owner access required."},{status:403});const result=await purgeRecord("products",id,{actor:auth.session.email||"admin",expectedRevision:body.expectedRevision,onlyExpired:false});if(result!=="deleted")throw Error("Deletion blocked or pending. Refresh and check references.");return noStoreJson({ok:true,purged:true});}
 if(!Number.isInteger(body.expectedRevision))throw Error("Refresh before moving this item to Trash.");
 return noStoreJson({ok:true,...await trashRecord("products",id,body.expectedRevision,auth.session.email||"admin")});
 }catch(e){return noStoreJson({message:e instanceof Error?e.message:"Trash action failed."},{status:409});}
}

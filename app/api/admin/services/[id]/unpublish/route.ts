import { commitContentBatch } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminService, logServiceAdminAction } from "@/lib/admin-services";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true); if ("response" in auth) return auth.response;
  const db = getAdminDb(); if (!db) return noStoreJson({ code:"database-unavailable", message:"Admin database is not configured." }, { status:503 });
  const { id } = await context.params; const service = await getAdminService(id);
  if (!service || service.preview) return noStoreJson({ code:"not-found", message:"Service not found." }, { status:404 });
  let expectedRevision=0; try { expectedRevision=Number(((await request.json()) as {expectedRevision?:number}).expectedRevision); } catch {}
  if (!Number.isInteger(expectedRevision) || expectedRevision !== service.revision) return noStoreJson({ code:"revision-conflict", message:"This service changed. Refresh before continuing.", currentRevision:service.revision }, { status:409 });
  const nextRevision=service.revision+1; await commitContentBatch("services",id,expectedRevision,service.mediaIds,(transaction)=>{
  transaction.update(db.collection("services").doc(id), { status:"draft", suppressStarterPublic:true, revision:nextRevision, updatedAt:FieldValue.serverTimestamp() });
  transaction.delete(db.collection("publicServices").doc(id)); });
  await logServiceAdminAction(auth.session.email,"service.unpublish",id); revalidatePath("/services"); revalidatePath(`/services/${service.slug}`);
  return noStoreJson({ok:true,revision:nextRevision});
}

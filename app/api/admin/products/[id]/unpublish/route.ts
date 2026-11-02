import { commitContentBatch } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminProduct, logAdminAction } from "@/lib/admin-products";
import { getAdminDb } from "@/lib/firebase-admin";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true); if ("response" in auth) return auth.response;
  const db = getAdminDb(); if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params; const product = await getAdminProduct(id);
  if (!product || product.preview) return noStoreJson({ code: "not-found", message: "Product not found." }, { status: 404 });
  let expectedRevision = 0; try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch {}
  if (!Number.isInteger(expectedRevision) || expectedRevision !== product.revision) return noStoreJson({ code:"revision-conflict", message:"This product changed. Refresh before continuing.", currentRevision:product.revision }, { status:409 });
  const nextRevision = product.revision + 1;
  await commitContentBatch("products",id,expectedRevision,product.mediaIds,(transaction)=>{ transaction.update(db.collection("products").doc(id), { status: "draft", revision: nextRevision, updatedAt: FieldValue.serverTimestamp() }); transaction.delete(db.collection("publicProducts").doc(id)); });
  await logAdminAction(auth.session.email, "product.unpublish", id); revalidatePath("/products"); revalidatePath(`/products/${product.slug}`);
  return noStoreJson({ ok: true, revision: nextRevision });
}

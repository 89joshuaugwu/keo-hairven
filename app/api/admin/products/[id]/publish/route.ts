import { commitContentBatch } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminMedia, getAdminProduct, logAdminAction, productPublishErrors, publicProductProjection } from "@/lib/admin-products";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  let expectedRevision = 0;
  try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch { /* handled below */ }
  const product = await getAdminProduct(id);
  if (!product || product.preview) return noStoreJson({ code: "not-found", message: "Save this product first, then publish it." }, { status: 404 });
  if (!Number.isInteger(expectedRevision) || expectedRevision !== product.revision) return noStoreJson({ code: "revision-conflict", message: "This product changed. Refresh before publishing.", currentRevision: product.revision }, { status: 409 });
  const media = await getAdminMedia(product.mediaIds);
  const fieldErrors = productPublishErrors(product, media);
  if (Object.keys(fieldErrors).length) return noStoreJson({ code: "publish-validation", message: "Finish the highlighted details before publishing.", fieldErrors }, { status: 400 });

  const duplicate = await db.collection("publicProducts").where("slug", "==", product.slug).limit(2).get();
  if (duplicate.docs.some((doc) => doc.id !== id)) return noStoreJson({ code: "slug-conflict", message: "That public product link is already in use." }, { status: 409 });

  const nextRevision = product.revision + 1;
  const projection = publicProductProjection(product, media);
  await commitContentBatch("products",id,expectedRevision,product.mediaIds,(transaction)=>{
  transaction.update(db.collection("products").doc(id), { status: "published", revision: nextRevision, updatedAt: FieldValue.serverTimestamp(), deletedAt: null });
  transaction.set(db.collection("publicProducts").doc(id), { ...projection, revision: nextRevision, updatedAt: FieldValue.serverTimestamp() });
  for (const mediaId of product.mediaIds) transaction.set(db.collection("media").doc(mediaId), { uses: FieldValue.arrayUnion(`product:${id}`) }, { merge: true });
  });
  await logAdminAction(auth.session.email, "product.publish", id);
  revalidatePath("/products");
  revalidatePath(`/products/${product.slug}`);
  return noStoreJson({ ok: true, revision: nextRevision, slug: product.slug });
}

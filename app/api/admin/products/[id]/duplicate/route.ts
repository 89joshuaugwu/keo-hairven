import { writeCategorized, validateMediaAssignment } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminProduct, logAdminAction, slugifyProduct } from "@/lib/admin-products";
import { getAdminDb } from "@/lib/firebase-admin";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true); if ("response" in auth) return auth.response;
  const db = getAdminDb(); if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params; const product = await getAdminProduct(id);
  if (!product || product.preview) return noStoreJson({ code: "not-found", message: "Save the starter draft before duplicating it." }, { status: 404 });
  let expectedRevision = 0; try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch {}
  if (!Number.isInteger(expectedRevision) || expectedRevision !== product.revision) return noStoreJson({ code:"revision-conflict", message:"This product changed. Refresh before duplicating it.", currentRevision:product.revision }, { status:409 });
  const ref = db.collection("products").doc(); const title = `${product.title} (copy)`; const slug = `${slugifyProduct(title)}-${ref.id.slice(0, 6).toLowerCase()}`;
  const { id: _id, revision: _rev, status: _status, createdAt: _created, updatedAt: _updated, deletedAt: _deleted, purgeAt:_purgeAt,purgeState:_purgeState, preview: _preview, ...copy } = product;
  await writeCategorized(ref, { ...copy, title, slug, status: "draft", ownerConfirmed: false, revision: 1, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), deletedAt: null }, "products");
  await logAdminAction(auth.session.email, "product.duplicate", ref.id); return noStoreJson({ ok: true, id: ref.id, revision: 1 });
}

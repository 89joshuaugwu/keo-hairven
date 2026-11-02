import { writeCategorized } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { draftPayload, getAdminProducts, logAdminAction, slugifyProduct, type AdminProductRecord } from "@/lib/admin-products";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  const products = await getAdminProducts();
  return noStoreJson({ products });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });

  let input: Partial<AdminProductRecord> = {};
  try { input = await request.json(); } catch { /* handled below */ }
  const payload = draftPayload(input);
  if (!payload.title) return noStoreJson({ code: "validation", message: "Add a product name before saving.", fieldErrors: { title: "Product name is required." } }, { status: 400 });

  const ref = db.collection("products").doc();
  const baseSlug = slugifyProduct(payload.slug || payload.title);
  const slug = `${baseSlug}-${ref.id.slice(0, 6).toLowerCase()}`;
  const record = {
    ...payload,
    slug,
    status: "draft",
    revision: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    deletedAt: null,
  };
  try{await writeCategorized(ref,record,"products");}catch(e){return noStoreJson({message:e instanceof Error?e.message:"Unable to save this draft."},{status:409});}
  await logAdminAction(auth.session.email, "product.create", ref.id);
  return noStoreJson({ ok: true, id: ref.id, revision: 1, slug }, { status: 201 });
}

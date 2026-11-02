import { writeCategorized } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminLooks, logLookAdminAction, lookDraftPayload, slugifyLook, starterLookById, type AdminLookRecord } from "@/lib/admin-looks";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  return noStoreJson({ looks: await getAdminLooks() });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });

  let input: Partial<AdminLookRecord> = {};
  try { input = await request.json(); } catch { /* validation below */ }
  const payload = lookDraftPayload(input);
  if (!payload.title) return noStoreJson({ code: "validation", message: "Add a look title before saving.", fieldErrors: { title: "Look title is required." } }, { status: 400 });

  const ref = db.collection("looks").doc();
  let slug = `${slugifyLook(payload.slug || payload.title)}-${ref.id.slice(0, 6).toLowerCase()}`;
  let reference = `KEO-LOOK-${ref.id.slice(0, 6).toUpperCase()}`;
  if (payload.sourceStarterId) {
    const starter = starterLookById(payload.sourceStarterId);
    if (starter) {
      const managed = await db.collection("looks").where("sourceStarterId", "==", payload.sourceStarterId).limit(1).get();
      if (!managed.empty) return noStoreJson({ code: "starter-managed", message: "This look is already in your Admin records." }, { status: 409 });
      slug = starter.slug;
      reference = starter.reference;
    }
  }
  const record = {
    ...payload,
    slug,
    reference,
    status: "draft",
    revision: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    deletedAt: null,
  };
  try{await writeCategorized(ref, record, "gallery");}catch(e){return noStoreJson({message:e instanceof Error?e.message:"Unable to save this draft."},{status:409});}
  await logLookAdminAction(auth.session.email, "look.create", ref.id);
  return noStoreJson({ ok: true, id: ref.id, revision: 1, slug, reference }, { status: 201 });
}

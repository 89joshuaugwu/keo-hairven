import { validateMediaAssignment } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminServices, logServiceAdminAction, serviceDraftPayload, slugifyService, starterServiceById, type AdminServiceRecord } from "@/lib/admin-services";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  return noStoreJson({ services: await getAdminServices() });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  let input: Partial<AdminServiceRecord> = {};
  try { input = await request.json(); } catch { /* validated below */ }
  const payload = serviceDraftPayload(input);
  if (!payload.title) return noStoreJson({ code: "validation", message: "Add a service title before saving.", fieldErrors: { title: "Service title is required." } }, { status: 400 });
  const ref = db.collection("services").doc();
  let slug = `${slugifyService(payload.slug || payload.title)}-${ref.id.slice(0, 6).toLowerCase()}`;
  if (payload.sourceStarterId) {
    const starter = starterServiceById(payload.sourceStarterId);
    if (starter) {
      const managed = await db.collection("services").where("sourceStarterId", "==", payload.sourceStarterId).limit(1).get();
      if (!managed.empty) return noStoreJson({ code: "starter-managed", message: "This service is already in your Admin records." }, { status: 409 });
      slug = starter.slug;
    }
  }
  await db.runTransaction(async tx=>{await validateMediaAssignment(tx,payload.mediaIds);tx.set(ref,{ ...payload, slug, status: "draft", revision: 1, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), deletedAt: null });});
  await logServiceAdminAction(auth.session.email, "service.create", ref.id);
  return noStoreJson({ ok: true, id: ref.id, revision: 1, slug }, { status: 201 });
}

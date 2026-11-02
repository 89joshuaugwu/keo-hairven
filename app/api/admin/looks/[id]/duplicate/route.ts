import { writeCategorized, validateMediaAssignment } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminLook, logLookAdminAction, slugifyLook } from "@/lib/admin-looks";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  const look = await getAdminLook(id);
  if (!look || look.preview) return noStoreJson({ code: "not-found", message: "Save this look before duplicating it." }, { status: 404 });
  let expectedRevision = 0;
  try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch { /* validation below */ }
  if (!Number.isInteger(expectedRevision) || expectedRevision !== look.revision) return noStoreJson({ code: "revision-conflict", message: "This look changed. Refresh before duplicating it.", currentRevision: look.revision }, { status: 409 });

  const ref = db.collection("looks").doc();
  const title = `${look.title} (copy)`;
  const slug = `${slugifyLook(title)}-${ref.id.slice(0, 6).toLowerCase()}`;
  const reference = `KEO-LOOK-${ref.id.slice(0, 6).toUpperCase()}`;
  const { id: _id, revision: _revision, status: _status, createdAt: _created, updatedAt: _updated, deletedAt: _deleted, purgeAt:_purgeAt,purgeState:_purgeState, preview: _preview, sourceStarterId: _starter, reference: _reference, slug: _slug, ...copy } = look;
  await writeCategorized(ref, { ...copy, title, slug, reference, clientPermission: false, status: "draft", revision: 1, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), deletedAt: null }, "gallery");
  await logLookAdminAction(auth.session.email, "look.duplicate", ref.id);
  return noStoreJson({ ok: true, id: ref.id, revision: 1 });
}

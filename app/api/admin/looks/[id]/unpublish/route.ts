import { commitContentBatch } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminLook, logLookAdminAction } from "@/lib/admin-looks";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  const look = await getAdminLook(id);
  if (!look || look.preview) return noStoreJson({ code: "not-found", message: "Look not found." }, { status: 404 });
  let expectedRevision = 0;
  try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch { /* validation below */ }
  if (!Number.isInteger(expectedRevision) || expectedRevision !== look.revision) return noStoreJson({ code: "revision-conflict", message: "This look changed. Refresh before continuing.", currentRevision: look.revision }, { status: 409 });
  const nextRevision = look.revision + 1;
  await commitContentBatch("looks",id,expectedRevision,look.mediaIds,(transaction)=>{
  transaction.update(db.collection("looks").doc(id), { status: "draft", suppressStarterPublic: true, revision: nextRevision, updatedAt: FieldValue.serverTimestamp() });
  transaction.delete(db.collection("publicLooks").doc(id));
  });
  await logLookAdminAction(auth.session.email, "look.unpublish", id);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${look.slug}`);
  return noStoreJson({ ok: true, revision: nextRevision });
}

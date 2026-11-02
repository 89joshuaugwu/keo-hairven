import { commitContentBatch } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminLook, getAdminLookMedia, logLookAdminAction, lookPublishErrors, publicLookProjection } from "@/lib/admin-looks";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  let expectedRevision = 0;
  try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch { /* validation below */ }
  const look = await getAdminLook(id);
  if (!look || look.preview) return noStoreJson({ code: "not-found", message: "Save this look first, then publish it." }, { status: 404 });
  if (!Number.isInteger(expectedRevision) || expectedRevision !== look.revision) return noStoreJson({ code: "revision-conflict", message: "This look changed. Refresh before publishing.", currentRevision: look.revision }, { status: 409 });
  const media = await getAdminLookMedia(look.mediaIds);
  const fieldErrors = lookPublishErrors(look, media);
  if (Object.keys(fieldErrors).length) return noStoreJson({ code: "publish-validation", message: "Finish the highlighted details before publishing.", fieldErrors }, { status: 400 });

  const duplicate = await db.collection("publicLooks").where("slug", "==", look.slug).limit(2).get();
  if (duplicate.docs.some((doc) => doc.id !== id)) return noStoreJson({ code: "slug-conflict", message: "That public gallery link is already in use." }, { status: 409 });

  const nextRevision = look.revision + 1;
  const projection = publicLookProjection(look, media);
  await commitContentBatch("looks",id,expectedRevision,look.mediaIds,(transaction)=>{
  transaction.update(db.collection("looks").doc(id), { status: "published", revision: nextRevision, updatedAt: FieldValue.serverTimestamp(), deletedAt: null });
  transaction.set(db.collection("publicLooks").doc(id), { ...projection, revision: nextRevision, updatedAt: FieldValue.serverTimestamp() });
  for (const mediaId of look.mediaIds) transaction.set(db.collection("media").doc(mediaId), { uses: FieldValue.arrayUnion(`look:${id}`) }, { merge: true });
  });
  await logLookAdminAction(auth.session.email, "look.publish", id);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${look.slug}`);
  return noStoreJson({ ok: true, revision: nextRevision, slug: look.slug });
}

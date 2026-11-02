import { commitContentBatch } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminService, getAdminServiceMedia, logServiceAdminAction, publicServiceProjection, servicePublishErrors } from "@/lib/admin-services";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const { id } = await context.params;
  let expectedRevision = 0;
  try { expectedRevision = Number(((await request.json()) as { expectedRevision?: number }).expectedRevision); } catch { /* validated below */ }
  const service = await getAdminService(id);
  if (!service || service.preview) return noStoreJson({ code: "not-found", message: "Save this service first, then publish it." }, { status: 404 });
  if (!Number.isInteger(expectedRevision) || expectedRevision !== service.revision) return noStoreJson({ code: "revision-conflict", message: "This service changed. Refresh before publishing.", currentRevision: service.revision }, { status: 409 });
  const media = await getAdminServiceMedia(service.mediaIds);
  const fieldErrors = servicePublishErrors(service, media);
  if (Object.keys(fieldErrors).length) return noStoreJson({ code: "publish-validation", message: "Finish the highlighted details before publishing.", fieldErrors }, { status: 400 });
  const duplicate = await db.collection("publicServices").where("slug", "==", service.slug).limit(2).get();
  if (duplicate.docs.some((doc) => doc.id !== id)) return noStoreJson({ code: "slug-conflict", message: "That public service link is already in use." }, { status: 409 });
  const nextRevision = service.revision + 1;
  const projection = publicServiceProjection(service, media);
  await commitContentBatch("services",id,expectedRevision,service.mediaIds,(transaction)=>{
  transaction.update(db.collection("services").doc(id), { status: "published", revision: nextRevision, updatedAt: FieldValue.serverTimestamp(), deletedAt: null });
  transaction.set(db.collection("publicServices").doc(id), { ...projection, revision: nextRevision, updatedAt: FieldValue.serverTimestamp() });
  for (const mediaId of service.mediaIds) transaction.set(db.collection("media").doc(mediaId), { uses: FieldValue.arrayUnion(`service:${id}`) }, { merge: true });
  });
  await logServiceAdminAction(auth.session.email, "service.publish", id);
  revalidatePath("/services");
  revalidatePath(`/services/${service.slug}`);
  return noStoreJson({ ok: true, revision: nextRevision, slug: service.slug });
}

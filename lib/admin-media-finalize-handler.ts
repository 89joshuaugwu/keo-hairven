import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { destroyCloudinaryAsset } from "@/lib/cloudinary-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { mediaLibraryFromDoc, logMediaAdminAction } from "@/lib/admin-media";

const imageFormats = new Set(["jpg", "jpeg", "png", "webp"]);
const videoFormats = new Set(["mp4", "webm"]);
const provenances = new Set(["real-work", "inspiration", "campaign", "actual-product", "service-media", "business-evidence"]);

export async function handleAdminMediaFinalize(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  if (!apiSecret) return noStoreJson({ code: "cloudinary-unavailable", message: "Cloudinary is not configured." }, { status: 503 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* validation below */ }
  const publicId = typeof body.public_id === "string" ? body.public_id : "";
  const version = Number(body.version);
  const signature = typeof body.signature === "string" ? body.signature : "";
  const secureUrl = typeof body.secure_url === "string" ? body.secure_url : "";
  const format = typeof body.format === "string" ? body.format.toLowerCase() : "";
  const resourceType = body.resource_type === "video" ? "video" : "image";
  const bytes = Number(body.bytes);
  const width = Number(body.width);
  const height = Number(body.height);
  const duration = Number(body.duration);
  const dominantColor = Array.isArray(body.colors) && Array.isArray(body.colors[0]) && typeof body.colors[0][0] === "string" ? String(body.colors[0][0]).slice(0, 20) : undefined;
  const expected = createHash("sha1").update(`public_id=${publicId}&version=${version}${apiSecret}`).digest("hex");
  const productUpload = publicId.startsWith("keo-hairven/products/");
  const libraryUpload = publicId.startsWith("keo-hairven/media/");

  if ((!productUpload && !libraryUpload) || !version || !signature || signature !== expected) {
    return noStoreJson({ code: "upload-verification", message: "The uploaded file could not be verified." }, { status: 400 });
  }
  if (!secureUrl.startsWith("https://res.cloudinary.com/") || !Number.isFinite(bytes) || bytes <= 0 || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return noStoreJson({ code: "upload-invalid", message: "The uploaded media is incomplete or invalid." }, { status: 400 });
  }
  if (resourceType === "image" && (!imageFormats.has(format) || bytes > 8 * 1024 * 1024)) {
    return noStoreJson({ code: "upload-invalid", message: "Use a JPG, PNG or WebP image up to 8 MB." }, { status: 400 });
  }
  if (resourceType === "video" && (!libraryUpload || !videoFormats.has(format) || bytes > 20 * 1024 * 1024 || !Number.isFinite(duration) || duration <= 0 || duration > 10.25)) {
    return noStoreJson({ code: "upload-invalid", message: "Use an MP4 or WebM video up to 20 MB and 10 seconds." }, { status: 400 });
  }

  const alt = typeof body.alt === "string" ? body.alt.trim().slice(0, 300) : "";
  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 500) : "";
  const originalFilename = typeof body.original_filename === "string" ? body.original_filename.trim().slice(0, 180) : "";
  const replaceId = typeof body.replaceId === "string" ? body.replaceId : "";
  const provenance = provenances.has(String(body.provenance)) ? String(body.provenance) : productUpload ? "actual-product" : "inspiration";
  const generated = productUpload || provenance === "actual-product" ? false : body.generated === true;
  const consentConfirmed = productUpload ? true : body.consentConfirmed === true;
  const actualItem = productUpload || provenance === "actual-product";

  if (provenance === "real-work" && !consentConfirmed) return noStoreJson({ code: "permission", message: "Confirm permission before saving real client work." }, { status: 400 });

  if (replaceId) {
    const ref = db.collection("media").doc(replaceId);
    const snap = await ref.get();
    if (!snap.exists) return noStoreJson({ code: "not-found", message: "Media not found." }, { status: 404 });
    const existing = mediaLibraryFromDoc(snap.id, snap.data() || {});
    if (existing.resourceType !== resourceType) return noStoreJson({ code: "replace-type", message: `Replace this ${existing.resourceType} with another ${existing.resourceType}.` }, { status: 400 });
    const expectedRevision = Number(body.expectedRevision);
    if (Number.isInteger(expectedRevision) && expectedRevision !== existing.revision) return noStoreJson({ code: "revision-conflict", message: "This media item changed in another session. Refresh and try again." }, { status: 409 });
    const previousPublicId = existing.publicId;
    const update = {
      publicId,
      secureUrl,
      format,
      bytes,
      width,
      height,
      ...(resourceType === "video" ? { duration } : { duration: FieldValue.delete() }),
      ...(dominantColor ? { dominantColor } : {}),
      ...(originalFilename ? { originalFilename } : {}),
      revision: existing.revision + 1,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.update(update);
    if (previousPublicId && previousPublicId !== publicId) await destroyCloudinaryAsset(previousPublicId, resourceType).catch(() => undefined);
    await logMediaAdminAction(auth.session.email, "media.replace", replaceId);
    const refreshed = await ref.get();
    return noStoreJson({ ok: true, media: mediaLibraryFromDoc(refreshed.id, refreshed.data() || {}) });
  }

  const ref = db.collection("media").doc();
  const stored = {
    publicId,
    resourceType,
    secureUrl,
    format,
    bytes,
    width,
    height,
    ...(resourceType === "video" ? { duration } : {}),
    ...(dominantColor ? { dominantColor } : {}),
    alt,
    caption,
    focal: { x: .5, y: .5 },
    provenance,
    generated,
    consentConfirmed,
    actualItem,
    originalFilename,
    status: "active",
    revision: 1,
    uses: [],
    createdBy: auth.session.email || auth.session.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(stored);
  await logMediaAdminAction(auth.session.email, "media.create", ref.id);
  return noStoreJson({ ok: true, media: mediaLibraryFromDoc(ref.id, stored) }, { status: 201 });
}

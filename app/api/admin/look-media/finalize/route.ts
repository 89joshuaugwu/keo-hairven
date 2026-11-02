import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
const imageFormats = new Set(["jpg", "jpeg", "png", "webp"]);
const videoFormats = new Set(["mp4", "webm"]);
const provenances = new Set(["real-work", "inspiration", "campaign"]);

export async function POST(request: NextRequest) {
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
  const expected = createHash("sha1").update(`public_id=${publicId}&version=${version}${apiSecret}`).digest("hex");

  if (!publicId.startsWith("keo-hairven/gallery/") || !version || !signature || signature !== expected) {
    return noStoreJson({ code: "upload-verification", message: "The uploaded file could not be verified." }, { status: 400 });
  }
  if (!secureUrl.startsWith("https://res.cloudinary.com/") || !Number.isFinite(bytes) || bytes <= 0 || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return noStoreJson({ code: "upload-invalid", message: "The uploaded media is incomplete or invalid." }, { status: 400 });
  }
  if (resourceType === "image" && (!imageFormats.has(format) || bytes > 8 * 1024 * 1024)) {
    return noStoreJson({ code: "upload-invalid", message: "Use a JPG, PNG or WebP image up to 8 MB." }, { status: 400 });
  }
  if (resourceType === "video" && (!videoFormats.has(format) || bytes > 20 * 1024 * 1024 || !Number.isFinite(duration) || duration <= 0 || duration > 10.25)) {
    return noStoreJson({ code: "upload-invalid", message: "Use an MP4 or WebM video up to 20 MB and 10 seconds." }, { status: 400 });
  }

  const alt = typeof body.alt === "string" ? body.alt.trim().slice(0, 300) : "";
  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 500) : "";
  const provenance = provenances.has(String(body.provenance)) ? String(body.provenance) : "inspiration";
  const generated = body.generated === true;
  const consentConfirmed = body.consentConfirmed === true;
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
    alt,
    caption,
    focal: { x: 0.5, y: 0.5 },
    provenance,
    generated,
    consentConfirmed,
    actualItem: false,
    uses: [],
    createdBy: auth.session.email || auth.session.uid,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(stored);
  return noStoreJson({ ok: true, media: { id: ref.id, ...stored, createdAt: undefined } }, { status: 201 });
}

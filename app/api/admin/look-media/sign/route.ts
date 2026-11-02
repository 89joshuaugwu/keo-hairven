import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";

export const runtime = "nodejs";

function signParams(params: Record<string, string | number>, secret: string) {
  const canonical = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${canonical}${secret}`).digest("hex");
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || "";
  if (!cloudName || !apiKey || !apiSecret) return noStoreJson({ code: "cloudinary-unavailable", message: "Cloudinary is not configured." }, { status: 503 });

  let body: { resourceType?: string } = {};
  try { body = await request.json(); } catch { /* default image */ }
  const resourceType = body.resourceType === "video" ? "video" : "image";
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "keo-hairven/gallery";
  const params: Record<string, string | number> = { timestamp, folder };
  if (preset) params.upload_preset = preset;
  const signature = signParams(params, apiSecret);
  return noStoreJson({
    cloudName,
    apiKey,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    params,
    signature,
  });
}

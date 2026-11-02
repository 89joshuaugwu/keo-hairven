import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { signCloudinaryParams } from "@/lib/cloudinary-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || "";
  if (!cloudName || !apiKey || !apiSecret) return noStoreJson({ code: "cloudinary-unavailable", message: "Cloudinary is not configured." }, { status: 503 });

  let body: { scope?: string; resourceType?: string } = {};
  try { body = await request.json(); } catch { /* product editor sends an empty body */ }
  const library = body.scope === "library";
  const resourceType = library && body.resourceType === "video" ? "video" : "image";
  const folder = library ? "keo-hairven/media" : "keo-hairven/products";
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = { timestamp, folder };
  if (library && resourceType === "image") params.colors = "true";
  if (preset) params.upload_preset = preset;
  return noStoreJson({
    cloudName,
    apiKey,
    resourceType,
    scope: library ? "library" : "product",
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    params,
    signature: signCloudinaryParams(params, apiSecret),
  });
}

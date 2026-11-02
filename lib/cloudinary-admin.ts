import { createHash } from "node:crypto";

export function signCloudinaryParams(params: Record<string, string | number | boolean>, secret: string) {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return createHash("sha1").update(`${canonical}${secret}`).digest("hex");
}

export async function destroyCloudinaryAsset(publicId: string, resourceType: "image" | "video") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  if (!cloudName || !apiKey || !apiSecret || !publicId) return { ok: false, message: "Cloudinary is not configured." };
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: true, public_id: publicId, timestamp };
  const signature = signCloudinaryParams(params, apiSecret);
  const form = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
    invalidate: "true",
  });
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({})) as { result?: string; error?: { message?: string } };
    if (!response.ok || !["ok", "not found"].includes(String(json.result))) {
      return { ok: false, message: json.error?.message || "Cloudinary could not remove the asset." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Cloudinary could not be reached." };
  }
}

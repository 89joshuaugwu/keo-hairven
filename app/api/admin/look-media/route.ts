import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { listGalleryMedia } from "@/lib/admin-looks";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  return noStoreJson({ media: await listGalleryMedia(100) });
}

import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminMediaLibrary } from "@/lib/admin-media";
import { listAdminMedia } from "@/lib/admin-products";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  if (request.nextUrl.searchParams.get("library") === "1") {
    const media = await getAdminMediaLibrary(true);
    return noStoreJson({ media });
  }
  // Backwards-compatible product-editor picker: active uploaded images only.
  const media = await listAdminMedia(100);
  return noStoreJson({ media });
}

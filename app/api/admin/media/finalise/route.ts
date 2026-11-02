import { NextRequest } from "next/server";
import { handleAdminMediaFinalize } from "@/lib/admin-media-finalize-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleAdminMediaFinalize(request);
}

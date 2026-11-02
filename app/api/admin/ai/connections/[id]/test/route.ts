import { NextRequest } from "next/server";
import { getAdminAiSettings, testAiConnection } from "@/lib/admin-ai";
import { noStoreJson, requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can test AI connections." }, { status: 403 });
  const { id } = await params;
  const result = await testAiConnection(id);
  return noStoreJson({ ...result, settings: await getAdminAiSettings() }, { status: result.ok ? 200 : 400 });
}

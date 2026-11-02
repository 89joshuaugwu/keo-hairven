import { getPublicAiConfig } from "@/lib/admin-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getPublicAiConfig(), { headers: { "Cache-Control": "no-store" } });
}

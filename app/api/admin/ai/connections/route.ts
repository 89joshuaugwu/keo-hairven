import { NextRequest } from "next/server";
import { addAiConnection, getAdminAiSettings } from "@/lib/admin-ai";
import { noStoreJson, requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can add AI connections." }, { status: 403 });
  let body: { label?: unknown; apiKey?: unknown; model?: unknown; priority?: unknown };
  try { body = await request.json(); } catch { return noStoreJson({ code: "bad-json", message: "Invalid connection request." }, { status: 400 }); }
  const result = await addAiConnection({
    label: typeof body.label === "string" ? body.label : "Gemini connection",
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
    model: typeof body.model === "string" ? body.model : "gemini-2.5-flash-lite",
    priority: Number(body.priority || 1),
  });
  if (!result.ok) return noStoreJson(result, { status: result.code === "validation" ? 400 : result.code === "limit" ? 409 : 500 });
  return noStoreJson({ ok: true, connection: result.connection, settings: await getAdminAiSettings(), message: result.testOk ? "Connection saved and tested successfully." : "Connection saved, but its test needs attention." });
}

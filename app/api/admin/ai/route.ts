import { NextRequest } from "next/server";
import { getAdminAiSettings, updateAdminAiSettings } from "@/lib/admin-ai";
import { noStoreJson, requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can manage Ask KEO." }, { status: 403 });
  return noStoreJson({ settings: await getAdminAiSettings() });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can manage Ask KEO." }, { status: 403 });
  let body: { enabled?: unknown; welcomeMessage?: unknown; dailyCap?: unknown; expectedRevision?: unknown };
  try { body = await request.json(); } catch { return noStoreJson({ code: "bad-json", message: "Invalid settings request." }, { status: 400 }); }
  const result = await updateAdminAiSettings({
    enabled: body.enabled !== false,
    welcomeMessage: typeof body.welcomeMessage === "string" ? body.welcomeMessage : "",
    dailyCap: Number(body.dailyCap || 50),
    expectedRevision: Number(body.expectedRevision || 0),
  });
  if (!result.ok) return noStoreJson(result, { status: result.code === "conflict" ? 409 : result.code === "validation" ? 400 : 500 });
  return noStoreJson({ ok: true, revision: result.revision, settings: await getAdminAiSettings(), message: "Ask KEO settings saved." });
}

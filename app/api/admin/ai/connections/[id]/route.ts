import { NextRequest } from "next/server";
import { deleteAiConnection, getAdminAiSettings, updateAiConnection } from "@/lib/admin-ai";
import { noStoreJson, requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can change AI connections." }, { status: 403 });
  const { id } = await params;
  let body: { label?: unknown; model?: unknown; priority?: unknown; enabled?: unknown; apiKey?: unknown };
  try { body = await request.json(); } catch { return noStoreJson({ code: "bad-json", message: "Invalid connection request." }, { status: 400 }); }
  const result = await updateAiConnection(id, {
    label: typeof body.label === "string" ? body.label : undefined,
    model: typeof body.model === "string" ? body.model : undefined,
    priority: body.priority === undefined ? undefined : Number(body.priority),
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
  });
  if (!result.ok) return noStoreJson(result, { status: result.code === "not-found" ? 404 : result.code === "validation" ? 400 : 500 });
  return noStoreJson({ ok: true, connection: result.connection, settings: await getAdminAiSettings(), message: "Connection updated." });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can remove AI connections." }, { status: 403 });
  const { id } = await params;
  const result = await deleteAiConnection(id);
  return noStoreJson(result, { status: result.ok ? 200 : 500 });
}

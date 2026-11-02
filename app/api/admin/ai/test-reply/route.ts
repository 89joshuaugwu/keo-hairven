import { NextRequest } from "next/server";
import { testAiReply } from "@/lib/admin-ai";
import { noStoreJson, requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "owner-only", message: "Only the owner can test Ask KEO." }, { status: 403 });
  let body: { question?: unknown };
  try { body = await request.json(); } catch { return noStoreJson({ code: "bad-json", message: "Invalid test request." }, { status: 400 }); }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) return noStoreJson({ code: "validation", message: "Enter a test question." }, { status: 400 });
  const result = await testAiReply(question);
  return noStoreJson(result, { status: result.ok ? 200 : 400 });
}

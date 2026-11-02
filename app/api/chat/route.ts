import { validateMuseInput } from "@/lib/muse-core";
import { replyWithMuse, visitorIdentity } from "@/lib/muse-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if ((origin && origin !== new URL(request.url).origin && origin !== configured) || request.headers.get("sec-fetch-site") === "cross-site") return respond({ message: "Please open KEO Muse from this website." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return respond({ message: "Send your question as JSON." }, 415);
  if (Number(request.headers.get("content-length") || 0) > 24_000) return respond({ message: "This message is too long." }, 413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return respond({ message: "Add a question first." }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 24_000) { await reader.cancel(); return respond({ message: "This message is too long." }, 413); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return respond({ message: "Please send a valid question." }, 400); }
    const input = validateMuseInput(raw);
    if (!input.ok) return respond({ message: input.message }, 400);
    return respond(await replyWithMuse(input.value, visitorIdentity(request)));
  } catch {
    return respond({ text: "KEO Muse couldn’t connect just now. Please try again or contact the KEO team.", mode: "fallback", actions: [{ label: "Contact the team", href: "/contact" }], allowedUrls: ["/contact"], notice: "Temporarily unavailable" }, 503);
  }
}

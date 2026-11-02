import "server-only";
import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAiRuntimeSettings, markAiConnectionResult } from "@/lib/admin-ai";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { getPublicFaqsServer } from "@/lib/public-faqs-server";
import { getPublicLooksServer } from "@/lib/public-looks-server";
import { getBrowseProductsServer } from "@/lib/public-products-server";
import { productPriceLabel } from "@/lib/products";
import { museCatalogueProducts } from "@/lib/muse-catalogue";
import { selectChatCards } from "@/lib/chat-presentation";
import { runMuse, type MuseInput } from "@/lib/muse-core";

export function visitorIdentity(request: Request) {
  // Only opt into a proxy header when the host overwrites it, not client input.
  const trustedHeader = process.env.AI_TRUSTED_IP_HEADER?.trim().toLowerCase();
  const session = request.headers.get("x-keo-session") || "anonymous";
  const source = trustedHeader ? request.headers.get(trustedHeader)?.split(",")[0]?.trim() || "unknown-proxy" : session;
  return crypto.createHmac("sha256", process.env.SESSION_CSRF_SECRET || "keo-public-fallback").update(source.slice(0, 180)).digest("hex");
}

export async function reserveMuseBudget(visitor: string, dailyCap: number, attempt: number, now = new Date()) {
  const db = getAdminDb();
  if (!db || !process.env.SESSION_CSRF_SECRET) return false;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const day = `${values.year}-${values.month}-${values.day}`;
  const globalRef = db.collection("aiRateLimits").doc(`global-${day}`);
  const visitorRef = db.collection("aiRateLimits").doc(`visitor-${day}-${visitor}`);
  try {
    return await db.runTransaction(async tx => {
      const [globalSnap, visitorSnap] = await Promise.all([tx.get(globalRef), tx.get(visitorRef)]);
      const global = globalSnap.data() || {}; const user = visitorSnap.data() || {}; const time = now.getTime();
      const sameWindow = time - Number(user.windowStart || 0) < 60_000;
      const minuteCount = sameWindow ? Number(user.minuteCount || 0) : 0;
      if (Number(global.count || 0) >= dailyCap || (attempt === 0 && (Number(user.count || 0) >= 40 || minuteCount >= 8))) return false;
      const expiresAt = Timestamp.fromMillis(time + 36 * 60 * 60 * 1000);
      tx.set(globalRef, { count: Number(global.count || 0) + 1, expiresAt });
      if (attempt === 0) tx.set(visitorRef, { count: Number(user.count || 0) + 1, minuteCount: minuteCount + 1, windowStart: sameWindow ? user.windowStart : time, expiresAt });
      return true;
    });
  } catch { return false; }
}

export async function generateMuseText(connection: { id: string; apiKey: string; model: string }, system: string, input: MuseInput) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(connection.model)}:generateContent`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(9000),
    headers: { "Content-Type": "application/json", "x-goog-api-key": connection.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [...input.history.map(turn => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.text }] })), { role: "user", parts: [{ text: input.message }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 750 },
    }),
  });
  if (!response.ok) {
    await markAiConnectionResult(connection.id, { status: response.status === 401 || response.status === 403 ? "action-needed" : "temporarily-unavailable", message: `Provider returned HTTP ${response.status}. Check this connection in AI settings.` });
    throw new Error("Provider unavailable");
  }
  const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[] };
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) return "";
  const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join("") || "";
  if (text.trim()) await markAiConnectionResult(connection.id, { status: "connected", message: "KEO Muse replied successfully." });
  return text;
}

export async function replyWithMuse(input: MuseInput, visitor: string) {
  const runtime = await getAiRuntimeSettings();
  const [business, faqs, looks, products] = await Promise.all([getPublicBusinessServer(), getPublicFaqsServer(), getPublicLooksServer(), getBrowseProductsServer(false)]);
  const context = {
    business, faqs, looks: looks.map(look => ({ title: look.title, categoryLabel: look.categoryLabel })),
    products: museCatalogueProducts(products).map(product => ({ id: product.id, slug: product.slug, title: product.title, status: product.status, designPreview: product.designPreview, price: productPriceLabel(product), availability: product.availability, specifications: { type: product.productType, material: product.hairMaterial, texture: product.hairTexture, colour: product.hairColour, density: product.hairDensity, lace: product.laceType } })),
  };
  const reply = await runMuse(input, context, runtime, { reserve: attempt => reserveMuseBudget(visitor, runtime.dailyCap, attempt), generate: generateMuseText });
  return { ...reply, cards: runtime.enabled ? selectChatCards(input.message, input.history, products) : [] };
}

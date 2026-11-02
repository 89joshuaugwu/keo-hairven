import "server-only";
import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_AI_DAILY_CAP,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_SETTINGS,
  DEFAULT_AI_WELCOME,
  cleanModelId,
  clampDailyCap,
  isValidGeminiModelId,
  type AdminAiConnection,
  type AdminAiSettings,
  type AiConnectionStatus,
  type PublicAiConfig,
} from "@/lib/ai-settings";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { getPublicFaqsServer } from "@/lib/public-faqs-server";
import { getPublicLooksServer } from "@/lib/public-looks-server";
import { getPublicServicesServer } from "@/lib/public-services-server";
import { getBrowseProductsServer } from "@/lib/public-products-server";
import { productPriceLabel } from "@/lib/products";

const SETTINGS_REF = ["settingsPrivate", "aiAssistant"] as const;
const PUBLIC_REF = ["publicSettings", "aiAssistant"] as const;
const CONNECTIONS_COLLECTION = "aiConnections";

type StoredCipher = { iv: string; tag: string; ciphertext: string };
type StoredConnection = Omit<AdminAiConnection, "id"> & { apiKeyCipher?: StoredCipher; createdAt?: unknown; updatedAt?: unknown };

type RuntimeConnection = AdminAiConnection & { apiKey: string };

function lagosDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function encryptionKey() {
  const source = process.env.AI_KEYS_ENCRYPTION_KEY_BASE64?.trim();
  if (!source) return null;
  try {
    const decoded = Buffer.from(source, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // fall through to deterministic key derivation for an existing strong secret.
  }
  return crypto.createHash("sha256").update(source).digest();
}

export function aiEncryptionReady() {
  return Boolean(encryptionKey());
}

function encryptApiKey(value: string): StoredCipher {
  const key = encryptionKey();
  if (!key) throw new Error("AI key encryption is not configured.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptApiKey(value: StoredCipher | undefined) {
  if (!value) return "";
  const key = encryptionKey();
  if (!key) return "";
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function hintForKey(value: string) {
  const trimmed = value.trim();
  const suffix = trimmed.slice(-4);
  return suffix ? `•••• ${suffix}` : "Saved key";
}

function toIso(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const candidate = value as { toDate?: () => Date };
  try { return candidate.toDate?.().toISOString() || ""; } catch { return ""; }
}

function publicConnection(id: string, data: Record<string, unknown>): AdminAiConnection {
  const status = ["connected", "not-connected", "temporarily-unavailable", "action-needed"].includes(String(data.status))
    ? String(data.status) as AiConnectionStatus
    : "not-connected";
  return {
    id,
    label: String(data.label || "Gemini connection"),
    provider: "gemini",
    model: cleanModelId(String(data.model || DEFAULT_AI_MODEL)) || DEFAULT_AI_MODEL,
    priority: Math.max(1, Number(data.priority || 1)),
    enabled: data.enabled !== false,
    status,
    keyHint: String(data.keyHint || "Saved key"),
    lastTestAt: toIso(data.lastTestAt),
    lastTestMessage: String(data.lastTestMessage || "Not tested yet."),
  };
}

async function usageToday() {
  const db = getAdminDb();
  if (!db) return 0;
  try {
    const snap = await db.collection("aiRateLimits").doc(`global-${lagosDayKey()}`).get();
    return Math.max(0, Number(snap.data()?.count || 0));
  } catch {
    return 0;
  }
}

export async function getAdminAiSettings(): Promise<AdminAiSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_AI_SETTINGS, encryptionReady: aiEncryptionReady() };
  try {
    const [settingsSnap, connectionSnap, used] = await Promise.all([
      db.collection(SETTINGS_REF[0]).doc(SETTINGS_REF[1]).get(),
      db.collection(CONNECTIONS_COLLECTION).orderBy("priority", "asc").get(),
      usageToday(),
    ]);
    const data = settingsSnap.data() || {};
    const connections = connectionSnap.docs.map((doc) => publicConnection(doc.id, doc.data()));
    return {
      enabled: data.enabled !== false,
      welcomeMessage: String(data.welcomeMessage || DEFAULT_AI_WELCOME),
      dailyCap: clampDailyCap(data.dailyCap || DEFAULT_AI_DAILY_CAP),
      revision: Math.max(0, Number(data.revision || 0)),
      connections,
      usageToday: used,
      encryptionReady: aiEncryptionReady(),
    };
  } catch {
    return { ...DEFAULT_AI_SETTINGS, encryptionReady: aiEncryptionReady() };
  }
}

export async function getPublicAiConfig(): Promise<PublicAiConfig> {
  const db = getAdminDb();
  if (!db) return { enabled: true, welcomeMessage: DEFAULT_AI_WELCOME };
  try {
    const snap = await db.collection(PUBLIC_REF[0]).doc(PUBLIC_REF[1]).get();
    if (!snap.exists) {
      const admin = await getAdminAiSettings();
      return { enabled: admin.enabled, welcomeMessage: admin.welcomeMessage };
    }
    const data = snap.data() || {};
    return {
      enabled: data.enabled !== false,
      welcomeMessage: String(data.welcomeMessage || DEFAULT_AI_WELCOME),
    };
  } catch {
    return { enabled: true, welcomeMessage: DEFAULT_AI_WELCOME };
  }
}

export async function updateAdminAiSettings(input: { enabled: boolean; welcomeMessage: string; dailyCap: number; expectedRevision: number }) {
  const db = getAdminDb();
  if (!db) return { ok: false as const, code: "not-configured", message: "Firebase Admin is not configured." };
  const welcomeMessage = input.welcomeMessage.trim().slice(0, 500);
  if (!welcomeMessage) return { ok: false as const, code: "validation", message: "Add the public welcome message." };
  const dailyCap = clampDailyCap(input.dailyCap);
  const ref = db.collection(SETTINGS_REF[0]).doc(SETTINGS_REF[1]);
  const publicRef = db.collection(PUBLIC_REF[0]).doc(PUBLIC_REF[1]);
  try {
    const revision = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const currentRevision = Number(snap.data()?.revision || 0);
      if (currentRevision !== Number(input.expectedRevision || 0)) throw new Error("revision-conflict");
      const nextRevision = currentRevision + 1;
      tx.set(ref, {
        enabled: Boolean(input.enabled),
        welcomeMessage,
        dailyCap,
        revision: nextRevision,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.set(publicRef, {
        enabled: Boolean(input.enabled),
        welcomeMessage,
        revision: nextRevision,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return nextRevision;
    });
    return { ok: true as const, revision };
  } catch (error) {
    if (error instanceof Error && error.message === "revision-conflict") return { ok: false as const, code: "conflict", message: "These AI settings changed in another session. Refresh before saving." };
    return { ok: false as const, code: "save-failed", message: "The AI settings could not be saved." };
  }
}

async function testGeminiRaw(apiKey: string, model: string, question = "Reply with exactly: Zara connection is working.", timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModelId(model))}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: question }] }], generationConfig: { temperature: 0, maxOutputTokens: 60 } }),
      signal: controller.signal,
      cache: "no-store",
    });
    const status = response.status;
    if (!response.ok) {
      const connectionStatus: AiConnectionStatus = status === 401 || status === 403 ? "action-needed" : "temporarily-unavailable";
      const message = status === 401 || status === 403 ? "The API key was rejected. Replace it and test again." : status === 429 ? "Gemini quota is currently unavailable for this connection/project." : `Gemini returned HTTP ${status}.`;
      return { ok: false as const, status, connectionStatus, message };
    }
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "Connection responded successfully.";
    return { ok: true as const, status, connectionStatus: "connected" as const, message: text.slice(0, 220) };
  } catch {
    return { ok: false as const, status: 504, connectionStatus: "temporarily-unavailable" as const, message: "The connection timed out or could not be reached." };
  } finally {
    clearTimeout(timer);
  }
}

export async function addAiConnection(input: { label: string; apiKey: string; model: string; priority?: number }) {
  const db = getAdminDb();
  if (!db) return { ok: false as const, code: "not-configured", message: "Firebase Admin is not configured." };
  if (!aiEncryptionReady()) return { ok: false as const, code: "encryption", message: "AI key encryption is not configured on the server." };
  const label = input.label.trim().slice(0, 80) || "Gemini connection";
  const apiKey = input.apiKey.trim();
  const model = cleanModelId(input.model || DEFAULT_AI_MODEL);
  if (apiKey.length < 16) return { ok: false as const, code: "validation", message: "Enter a valid Gemini API key." };
  if (!isValidGeminiModelId(model)) return { ok: false as const, code: "validation", message: "Enter a valid Gemini model ID." };
  const current = await db.collection(CONNECTIONS_COLLECTION).get();
  if (current.size >= 6) return { ok: false as const, code: "limit", message: "Up to 6 AI connections can be stored." };
  const priority = Math.min(20, Math.max(1, Number(input.priority || current.size + 1)));
  const test = await testGeminiRaw(apiKey, model);
  const ref = db.collection(CONNECTIONS_COLLECTION).doc();
  await ref.set({
    label,
    provider: "gemini",
    model,
    priority,
    enabled: true,
    status: test.connectionStatus,
    keyHint: hintForKey(apiKey),
    apiKeyCipher: encryptApiKey(apiKey),
    lastTestAt: FieldValue.serverTimestamp(),
    lastTestMessage: test.message,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return { ok: true as const, connection: publicConnection(ref.id, snap.data() || {}), testOk: test.ok };
}

export async function updateAiConnection(id: string, input: { label?: string; model?: string; priority?: number; enabled?: boolean; apiKey?: string }) {
  const db = getAdminDb();
  if (!db) return { ok: false as const, code: "not-configured", message: "Firebase Admin is not configured." };
  const ref = db.collection(CONNECTIONS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false as const, code: "not-found", message: "That AI connection no longer exists." };
  const current = snap.data() as StoredConnection;
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (typeof input.label === "string") patch.label = input.label.trim().slice(0, 80) || "Gemini connection";
  if (typeof input.model === "string") {
    const model = cleanModelId(input.model);
    if (!isValidGeminiModelId(model)) return { ok: false as const, code: "validation", message: "Enter a valid Gemini model ID." };
    patch.model = model;
  }
  if (input.priority !== undefined) patch.priority = Math.min(20, Math.max(1, Math.round(Number(input.priority) || 1)));
  if (input.enabled !== undefined) patch.enabled = Boolean(input.enabled);
  if (typeof input.apiKey === "string" && input.apiKey.trim()) {
    if (!aiEncryptionReady()) return { ok: false as const, code: "encryption", message: "AI key encryption is not configured on the server." };
    const apiKey = input.apiKey.trim();
    if (apiKey.length < 16) return { ok: false as const, code: "validation", message: "Enter a valid Gemini API key." };
    const model = cleanModelId(String(patch.model || current.model || DEFAULT_AI_MODEL));
    const test = await testGeminiRaw(apiKey, model);
    patch.apiKeyCipher = encryptApiKey(apiKey);
    patch.keyHint = hintForKey(apiKey);
    patch.status = test.connectionStatus;
    patch.lastTestAt = FieldValue.serverTimestamp();
    patch.lastTestMessage = test.message;
  }
  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return { ok: true as const, connection: publicConnection(id, updated.data() || {}) };
}

export async function deleteAiConnection(id: string) {
  const db = getAdminDb();
  if (!db) return { ok: false as const, code: "not-configured", message: "Firebase Admin is not configured." };
  await db.collection(CONNECTIONS_COLLECTION).doc(id).delete();
  return { ok: true as const };
}

export async function testAiConnection(id: string) {
  const db = getAdminDb();
  if (!db) return { ok: false as const, code: "not-configured", message: "Firebase Admin is not configured." };
  const ref = db.collection(CONNECTIONS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false as const, code: "not-found", message: "That AI connection no longer exists." };
  const data = snap.data() as StoredConnection;
  const key = decryptApiKey(data.apiKeyCipher);
  if (!key) return { ok: false as const, code: "decrypt", message: "The saved key could not be decrypted. Replace the key." };
  const test = await testGeminiRaw(key, String(data.model || DEFAULT_AI_MODEL));
  await ref.set({ status: test.connectionStatus, lastTestAt: FieldValue.serverTimestamp(), lastTestMessage: test.message, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: test.ok, code: test.ok ? "ok" : "test-failed", message: test.message, status: test.connectionStatus };
}

export async function getAiRuntimeSettings(): Promise<{ enabled: boolean; welcomeMessage: string; dailyCap: number; connections: RuntimeConnection[] }> {
  const db = getAdminDb();
  if (!db) return { enabled: false, welcomeMessage: DEFAULT_AI_WELCOME, dailyCap: DEFAULT_AI_DAILY_CAP, connections: [] };
  try {
    const [settingsSnap, connectionSnap] = await Promise.all([
      db.collection(SETTINGS_REF[0]).doc(SETTINGS_REF[1]).get(),
      db.collection(CONNECTIONS_COLLECTION).orderBy("priority", "asc").get(),
    ]);
    const settings = settingsSnap.data() || {};
    const connections = connectionSnap.docs.flatMap((doc) => {
      const data = doc.data() as StoredConnection;
      if (data.enabled === false) return [];
      const apiKey = decryptApiKey(data.apiKeyCipher);
      if (!apiKey) return [];
      return [{ ...publicConnection(doc.id, data as unknown as Record<string, unknown>), apiKey }];
    });
    return {
      enabled: settings.enabled !== false,
      welcomeMessage: String(settings.welcomeMessage || DEFAULT_AI_WELCOME),
      dailyCap: clampDailyCap(settings.dailyCap || DEFAULT_AI_DAILY_CAP),
      connections,
    };
  } catch {
    return { enabled: false, welcomeMessage: DEFAULT_AI_WELCOME, dailyCap: DEFAULT_AI_DAILY_CAP, connections: [] };
  }
}

export async function markAiConnectionResult(id: string, input: { status: AiConnectionStatus; message: string }) {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(CONNECTIONS_COLLECTION).doc(id).set({ status: input.status, lastTestAt: FieldValue.serverTimestamp(), lastTestMessage: input.message.slice(0, 240), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch {
    // A public chat should not fail because status telemetry could not be written.
  }
}

async function buildAdminTestContext() {
  const [business, faqs, services, looks, products] = await Promise.all([
    getPublicBusinessServer(), getPublicFaqsServer(), getPublicServicesServer(), getPublicLooksServer(), getBrowseProductsServer(false),
  ]);
  return [
    `Business: ${business.name}`,
    `Location: ${business.publicLocation}`,
    business.address ? `Public address: ${business.address}` : "Exact meeting point is not published.",
    business.hours ? `Opening hours: ${business.hours}` : "Opening hours are not published.",
    `WhatsApp: ${business.whatsappDisplay}`,
    `Waybill: ${business.deliveryNote}`,
    business.instagramUrl ? `Instagram: ${business.instagramUrl}` : "Instagram: not published",
    business.tiktokUrl ? `TikTok: ${business.tiktokUrl}` : "TikTok: not published",
    `Products:\n${products.map((product) => `- ${product.title} | ${productPriceLabel(product)} | availability: ${product.availability}`).join("\n") || "No published products."}`,
    `FAQs:\n${faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n")}`,
    `Services:\n${services.map((service) => `- ${service.categoryLabel}: ${service.detailPriceLabel}; ${service.listDescription}`).join("\n")}`,
    `Gallery:\n${looks.map((look) => `- ${look.title}: ${look.categoryLabel}`).join("\n")}`,
  ].join("\n");
}

export async function testAiReply(question: string) {
  const runtime = await getAiRuntimeSettings();
  if (!runtime.enabled) return { ok: false as const, message: "Ask KEO is currently disabled." };
  const connection = runtime.connections[0];
  if (!connection) return { ok: false as const, message: "Add and enable a Gemini connection first." };
  const context = await buildAdminTestContext();
  const prompt = `You are Ask KEO, the customer-facing guide for KEO Hairven. Answer only from the approved public context below. Answer every part of a multi-part question. Product lengths are identity-critical: never answer a 14-inch question using a 12-inch or 16-inch product. If a user names two lengths, compare those exact records. If a request is ambiguous, ask one short clarification instead of guessing. Do not carry an old product into a new unrelated topic. Never invent stock, availability, payment confirmation, appointments, delivery costs or timing. Keep the answer natural and brief.

APPROVED PUBLIC CONTEXT:
${context}

QUESTION:
${question.slice(0, 1000)}`
  const result = await testGeminiRaw(connection.apiKey, connection.model, prompt, 10000);
  await markAiConnectionResult(connection.id, { status: result.connectionStatus, message: result.message });
  return result.ok ? { ok: true as const, message: result.message } : { ok: false as const, message: result.message };
}

export function aiRateLimitExpiry() {
  return Timestamp.fromDate(new Date(Date.now() + 36 * 60 * 60 * 1000));
}

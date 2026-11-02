export type AiConnectionStatus = "connected" | "not-connected" | "temporarily-unavailable" | "action-needed";

export type AdminAiConnection = {
  id: string;
  label: string;
  provider: "gemini";
  model: string;
  priority: number;
  enabled: boolean;
  status: AiConnectionStatus;
  keyHint: string;
  lastTestAt: string;
  lastTestMessage: string;
};

export type AdminAiSettings = {
  enabled: boolean;
  welcomeMessage: string;
  dailyCap: number;
  revision: number;
  connections: AdminAiConnection[];
  usageToday: number;
  encryptionReady: boolean;
  environmentConfigured?: boolean;
};

export type PublicAiConfig = {
  enabled: boolean;
  welcomeMessage: string;
};

export const DEFAULT_AI_WELCOME = "Hi, I’m KEO Muse — your AI hair guide. Tell me the look you have in mind, or ask about the collection and delivery.";
export const DEFAULT_AI_DAILY_CAP = 50;
export const DEFAULT_AI_MODEL = "gemini-3.1-flash-lite";

export const DEFAULT_AI_SETTINGS: AdminAiSettings = {
  enabled: true,
  welcomeMessage: DEFAULT_AI_WELCOME,
  dailyCap: DEFAULT_AI_DAILY_CAP,
  revision: 0,
  connections: [],
  usageToday: 0,
  encryptionReady: false,
};

export function cleanModelId(value: string) {
  return value.trim().replace(/^models\//, "");
}

export function isValidGeminiModelId(value: string) {
  const clean = cleanModelId(value);
  return /^[a-z0-9][a-z0-9._-]{2,79}$/i.test(clean);
}

export function clampDailyCap(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_AI_DAILY_CAP;
  return Math.min(5000, Math.max(1, Math.round(number)));
}

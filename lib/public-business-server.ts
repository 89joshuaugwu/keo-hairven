import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  defaultPublicBusinessSettings,
  displayPhoneFromE164,
  digitsFromE164,
  isValidE164,
  type PublicBusinessSettings,
} from "@/lib/business-settings";

function fromRaw(raw: unknown): PublicBusinessSettings {
  if (!raw || typeof raw !== "object") return defaultPublicBusinessSettings;
  const item = raw as Record<string, unknown>;
  const phone = typeof item.whatsappE164 === "string" && isValidE164(item.whatsappE164)
    ? item.whatsappE164
    : defaultPublicBusinessSettings.whatsappE164;
  const optional = (key: string) => typeof item[key] === "string" && String(item[key]).trim() ? String(item[key]).trim() : undefined;
  return {
    published: item.published === true,
    revision: Number.isInteger(item.revision) ? Number(item.revision) : 0,
    name: optional("name") || defaultPublicBusinessSettings.name,
    tagline: optional("tagline") || defaultPublicBusinessSettings.tagline,
    whatsappE164: phone,
    whatsappDigits: typeof item.whatsappDigits === "string" && /^\d{8,15}$/.test(item.whatsappDigits)
      ? item.whatsappDigits
      : digitsFromE164(phone),
    whatsappDisplay: optional("whatsappDisplay") || displayPhoneFromE164(phone),
    publicLocation: optional("publicLocation") || defaultPublicBusinessSettings.publicLocation,
    ...(optional("address") ? { address: optional("address") } : {}),
    ...(optional("hours") ? { hours: optional("hours") } : {}),
    deliveryNote: optional("deliveryNote") || defaultPublicBusinessSettings.deliveryNote,
    ...(optional("instagramUrl") ? { instagramUrl: optional("instagramUrl") } : {}),
    ...(optional("tiktokUrl") ? { tiktokUrl: optional("tiktokUrl") } : {}),
  };
}

export async function getPublicBusinessServer(): Promise<PublicBusinessSettings> {
  const db = getAdminDb();
  if (!db) return defaultPublicBusinessSettings;
  try {
    const snap = await db.collection("publicSettings").doc("site").get();
    if (!snap.exists) return defaultPublicBusinessSettings;
    return fromRaw(snap.data()?.business);
  } catch {
    return defaultPublicBusinessSettings;
  }
}

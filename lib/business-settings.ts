export type PublicBusinessSettings = {
  published: boolean;
  revision: number;
  name: string;
  tagline: string;
  whatsappE164: string;
  whatsappDigits: string;
  whatsappDisplay: string;
  publicLocation: string;
  address?: string;
  hours?: string;
  deliveryNote: string;
  instagramUrl?: string;
  tiktokUrl?: string;
};

export type AdminBusinessSettings = Omit<PublicBusinessSettings, "published" | "whatsappDigits" | "whatsappDisplay"> & {
  address: string;
  hours: string;
  instagramUrl: string;
  tiktokUrl: string;
};

export const defaultPublicBusinessSettings: PublicBusinessSettings = {
  published: false,
  revision: 0,
  name: "KEO Hairven",
  tagline: "Confidence in every strand.",
  whatsappE164: "",
  whatsappDigits: "",
  whatsappDisplay: "",
  publicLocation: "Nigeria",
  deliveryNote: "Delivery location, fees and timing are confirmed in conversation before purchase.",
};

export const defaultAdminBusinessSettings: AdminBusinessSettings = {
  revision: 0,
  name: defaultPublicBusinessSettings.name,
  tagline: defaultPublicBusinessSettings.tagline,
  whatsappE164: defaultPublicBusinessSettings.whatsappE164,
  publicLocation: defaultPublicBusinessSettings.publicLocation,
  address: "",
  hours: "",
  deliveryNote: defaultPublicBusinessSettings.deliveryNote,
  instagramUrl: "",
  tiktokUrl: "",
};

function clean(value: unknown, max: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

export function normalizeWhatsAppE164(value: string) {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  if (/^00\d+$/.test(trimmed)) return `+${trimmed.slice(2)}`;
  return trimmed;
}

export function isValidE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(normalizeWhatsAppE164(value));
}

export function digitsFromE164(value: string) {
  return normalizeWhatsAppE164(value).replace(/^\+/, "");
}

export function displayPhoneFromE164(value: string) {
  const normalized = normalizeWhatsAppE164(value);
  if (/^\+234\d{10}$/.test(normalized)) {
    const digits = normalized.slice(4);
    return `+234 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (/^\+\d{8,15}$/.test(normalized)) return normalized;
  return value.trim();
}

function cleanOptionalUrl(value: unknown, expectedHost: "instagram" | "tiktok") {
  const input = clean(value, 500);
  if (!input) return "";
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") return input;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (expectedHost === "instagram" && !host.endsWith("instagram.com")) return input;
    if (expectedHost === "tiktok" && !host.endsWith("tiktok.com")) return input;
    return url.toString();
  } catch {
    return input;
  }
}

export function sanitiseBusinessSettings(input: Partial<AdminBusinessSettings>): AdminBusinessSettings {
  return {
    revision: Number.isInteger(input.revision) ? Number(input.revision) : 0,
    name: clean(input.name, 100, defaultAdminBusinessSettings.name),
    tagline: clean(input.tagline, 140, defaultAdminBusinessSettings.tagline),
    whatsappE164: normalizeWhatsAppE164(clean(input.whatsappE164, 24, defaultAdminBusinessSettings.whatsappE164)),
    publicLocation: clean(input.publicLocation, 160, defaultAdminBusinessSettings.publicLocation),
    address: clean(input.address, 300),
    hours: clean(input.hours, 300),
    deliveryNote: clean(input.deliveryNote, 500, defaultAdminBusinessSettings.deliveryNote),
    instagramUrl: cleanOptionalUrl(input.instagramUrl, "instagram"),
    tiktokUrl: cleanOptionalUrl(input.tiktokUrl, "tiktok"),
  };
}

export function validateBusinessSettings(input: AdminBusinessSettings) {
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "Add the public brand name.";
  if (!input.tagline.trim()) fieldErrors.tagline = "Add the brand tagline.";
  if (!isValidE164(input.whatsappE164)) fieldErrors.whatsappE164 = "Enter the WhatsApp number in international format, for example +2348012345678.";
  if (!input.publicLocation.trim()) fieldErrors.publicLocation = "Add the public location customers should see.";
  if (!input.deliveryNote.trim()) fieldErrors.deliveryNote = "Add a short waybill/delivery note.";
  for (const [key, value, domain] of [
    ["instagramUrl", input.instagramUrl, "instagram.com"],
    ["tiktokUrl", input.tiktokUrl, "tiktok.com"],
  ] as const) {
    if (!value) continue;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if ((url.protocol !== "https:" && url.protocol !== "http:") || !host.endsWith(domain)) {
        fieldErrors[key] = `Enter a valid ${domain} URL or leave it blank.`;
      }
    } catch {
      fieldErrors[key] = `Enter a valid ${domain} URL or leave it blank.`;
    }
  }
  return fieldErrors;
}

export function adminBusinessToPublic(input: AdminBusinessSettings, revision: number): PublicBusinessSettings {
  const phone = normalizeWhatsAppE164(input.whatsappE164);
  return {
    published: true,
    revision,
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    whatsappE164: phone,
    whatsappDigits: digitsFromE164(phone),
    whatsappDisplay: displayPhoneFromE164(phone),
    publicLocation: input.publicLocation.trim(),
    ...(input.address.trim() ? { address: input.address.trim() } : {}),
    ...(input.hours.trim() ? { hours: input.hours.trim() } : {}),
    deliveryNote: input.deliveryNote.trim(),
    ...(input.instagramUrl.trim() ? { instagramUrl: input.instagramUrl.trim() } : {}),
    ...(input.tiktokUrl.trim() ? { tiktokUrl: input.tiktokUrl.trim() } : {}),
  };
}

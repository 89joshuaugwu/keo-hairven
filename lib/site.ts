import { defaultPublicBusinessSettings } from "@/lib/business-settings";

/**
 * Static fallback values. Public UI should prefer the business settings provider
 * or getPublicBusinessServer(), but these defaults keep the site usable before
 * Firestore public settings exist.
 */
export const site = {
  name: defaultPublicBusinessSettings.name,
  tagline: defaultPublicBusinessSettings.tagline,
  location: defaultPublicBusinessSettings.publicLocation,
  whatsappDisplay: defaultPublicBusinessSettings.whatsappDisplay,
  whatsappDigits: defaultPublicBusinessSettings.whatsappDigits,
  whatsappE164: defaultPublicBusinessSettings.whatsappE164,
} as const;

function encodeWhatsAppText(message: string) {
  return encodeURIComponent(message).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function whatsappUrl(message: string, digits = site.whatsappDigits) {
  const safeDigits = /^\d{8,15}$/.test(digits) ? digits : "";
  return safeDigits ? `https://wa.me/${safeDigits}?text=${encodeWhatsAppText(message)}` : "/contact?whatsapp=not-configured";
}

export function generalEnquiryFor(digits = site.whatsappDigits, businessName = site.name) {
  return whatsappUrl(
    `Hi ${businessName}, I found you through the website and I’d like to ask about hair products, extensions or wigs.`,
    digits
  );
}

export const generalEnquiry = generalEnquiryFor();

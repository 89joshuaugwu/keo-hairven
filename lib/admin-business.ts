import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  defaultAdminBusinessSettings,
  sanitiseBusinessSettings,
  type AdminBusinessSettings,
} from "@/lib/business-settings";

function fromPrivateDoc(raw: Record<string, any> | undefined): AdminBusinessSettings {
  const revision = raw && Number.isInteger(raw.revision) ? Number(raw.revision) : 0;
  const business = raw?.business && typeof raw.business === "object" ? raw.business as Record<string, unknown> : {};
  return sanitiseBusinessSettings({
    revision,
    name: typeof business.name === "string" ? business.name : defaultAdminBusinessSettings.name,
    tagline: typeof business.tagline === "string" ? business.tagline : defaultAdminBusinessSettings.tagline,
    whatsappE164: typeof business.whatsappE164 === "string" ? business.whatsappE164 : defaultAdminBusinessSettings.whatsappE164,
    publicLocation: typeof business.publicLocation === "string" ? business.publicLocation : defaultAdminBusinessSettings.publicLocation,
    address: typeof business.address === "string" ? business.address : "",
    hours: typeof business.hours === "string" ? business.hours : "",
    deliveryNote: typeof business.deliveryNote === "string" ? business.deliveryNote : defaultAdminBusinessSettings.deliveryNote,
    instagramUrl: typeof business.instagramUrl === "string" ? business.instagramUrl : "",
    tiktokUrl: typeof business.tiktokUrl === "string" ? business.tiktokUrl : "",
  });
}

function fromPublicBusiness(raw: Record<string, any> | undefined, revision: number): AdminBusinessSettings {
  const business = raw?.business && typeof raw.business === "object" ? raw.business as Record<string, unknown> : {};
  return sanitiseBusinessSettings({
    revision,
    name: typeof business.name === "string" ? business.name : defaultAdminBusinessSettings.name,
    tagline: typeof business.tagline === "string" ? business.tagline : defaultAdminBusinessSettings.tagline,
    whatsappE164: typeof business.whatsappE164 === "string" ? business.whatsappE164 : defaultAdminBusinessSettings.whatsappE164,
    publicLocation: typeof business.publicLocation === "string" ? business.publicLocation : defaultAdminBusinessSettings.publicLocation,
    address: typeof business.address === "string" ? business.address : "",
    hours: typeof business.hours === "string" ? business.hours : "",
    deliveryNote: typeof business.deliveryNote === "string" ? business.deliveryNote : defaultAdminBusinessSettings.deliveryNote,
    instagramUrl: typeof business.instagramUrl === "string" ? business.instagramUrl : "",
    tiktokUrl: typeof business.tiktokUrl === "string" ? business.tiktokUrl : "",
  });
}

export async function getAdminBusinessSettings(): Promise<AdminBusinessSettings> {
  const db = getAdminDb();
  if (!db) return { ...defaultAdminBusinessSettings };
  try {
    const [draftSnap, publicSnap] = await Promise.all([
      db.collection("settingsDrafts").doc("site").get(),
      db.collection("publicSettings").doc("site").get(),
    ]);
    const revision = draftSnap.exists && Number.isInteger(draftSnap.data()?.revision) ? Number(draftSnap.data()?.revision) : 0;
    if (draftSnap.exists && draftSnap.data()?.business && typeof draftSnap.data()?.business === "object") {
      return fromPrivateDoc(draftSnap.data());
    }
    if (publicSnap.exists && publicSnap.data()?.business && typeof publicSnap.data()?.business === "object") {
      return fromPublicBusiness(publicSnap.data(), revision);
    }
    return { ...defaultAdminBusinessSettings, revision };
  } catch {
    return { ...defaultAdminBusinessSettings };
  }
}

export async function logBusinessAdminAction(actor: string | undefined, action: string, success = true) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("adminAudit").add({
    actor: actor || "admin",
    action,
    entityId: "site",
    success,
    createdAt: FieldValue.serverTimestamp(),
  }).catch(() => undefined);
}

import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { adminTimeMillis } from "@/lib/admin-serialise";
import { mediaFromDoc } from "@/lib/admin-products";
import type { AdminMediaRecord } from "@/lib/admin-product-shared";
import { serviceDesignPreview, type ServicePriceMode } from "@/lib/services";

export type { AdminServiceStatus, AdminServiceRecord, AdminServiceListItem } from "@/lib/admin-service-shared";
import type { AdminServiceStatus, AdminServiceRecord, AdminServiceListItem } from "@/lib/admin-service-shared";

const priceModes = new Set<ServicePriceMode>(["fixed", "from", "range", "hidden", "quote"]);

export function slugifyService(value: string) {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "service";
}

function previewPrice(service: (typeof serviceDesignPreview)[number]) {
  return {
    priceMode: service.priceMode,
    ...(Number.isInteger(service.priceMinor) ? { priceMinor: service.priceMinor } : {}),
    ...(Number.isInteger(service.minPriceMinor) ? { minPriceMinor: service.minPriceMinor } : {}),
    ...(Number.isInteger(service.maxPriceMinor) ? { maxPriceMinor: service.maxPriceMinor } : {}),
  };
}

function starterFromPublic(service: (typeof serviceDesignPreview)[number]): AdminServiceRecord {
  return {
    id: service.id,
    sourceStarterId: service.id,
    slug: service.slug,
    title: service.categoryLabel,
    description: service.detailDescription,
    mediaIds: [],
    ...previewPrice(service),
    preparation: service.guideRows.find((row) => row.title === "Before you visit")?.body || "",
    status: "draft",
    revision: 0,
    preview: true,
  };
}

export function starterServiceById(id: string): AdminServiceRecord | null {
  const service = serviceDesignPreview.find((item) => item.id === id);
  return service ? starterFromPublic(service) : null;
}

export function starterServiceMedia(id?: string) {
  if (!id) return undefined;
  return serviceDesignPreview.find((item) => item.id === id)?.media;
}

function fromDoc(id: string, raw: Record<string, any>): AdminServiceRecord {
  const priceMode = priceModes.has(raw.priceMode as ServicePriceMode) ? raw.priceMode as ServicePriceMode : "quote";
  return {
    id,
    sourceStarterId: typeof raw.sourceStarterId === "string" ? raw.sourceStarterId : undefined,
    suppressStarterPublic: raw.suppressStarterPublic === true,
    slug: typeof raw.slug === "string" ? raw.slug : "",
    title: typeof raw.title === "string" ? raw.title : "Untitled service",
    description: typeof raw.description === "string" ? raw.description : "",
    mediaIds: Array.isArray(raw.mediaIds) ? raw.mediaIds.filter((value: unknown): value is string => typeof value === "string") : [],
    priceMode,
    priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : undefined,
    minPriceMinor: Number.isInteger(raw.minPriceMinor) ? raw.minPriceMinor : undefined,
    maxPriceMinor: Number.isInteger(raw.maxPriceMinor) ? raw.maxPriceMinor : undefined,
    preparation: typeof raw.preparation === "string" ? raw.preparation : "",
    status: ["draft", "published", "archived", "trashed"].includes(raw.status) ? raw.status : "draft",
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
    createdAt: adminTimeMillis(raw.createdAt),
    updatedAt: adminTimeMillis(raw.updatedAt),
    deletedAt: adminTimeMillis(raw.deletedAt),
    purgeAt: adminTimeMillis(raw.purgeAt),
    purgeState: typeof raw.purgeState === "string" ? raw.purgeState : undefined,
  };
}

async function loadMediaMap(ids: string[]) {
  const db = getAdminDb();
  const media = new Map<string, AdminMediaRecord>();
  if (!db || !ids.length) return media;
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const snap = await db.collection("media").where(FieldPath.documentId(), "in", chunk).get().catch(() => null);
    snap?.docs.forEach((doc) => media.set(doc.id, mediaFromDoc(doc.id, doc.data())));
  }
  return media;
}

function previewList(excludeStarterIds = new Set<string>()): AdminServiceListItem[] {
  return serviceDesignPreview
    .filter((service) => !excludeStarterIds.has(service.id))
    .map((service) => ({
      ...starterFromPublic(service),
      thumbnail: service.media.src,
      imageAlt: service.media.alt,
    }));
}

export async function getAdminServices(): Promise<AdminServiceListItem[]> {
  const db = getAdminDb();
  if (!db) return previewList();
  let snap;
  try {
    snap = await db.collection("services").limit(200).get();
  } catch {
    return previewList();
  }
  if (snap.empty) return previewList(await getStarterSuppressions("services"));
  const records = snap.docs.map((doc) => fromDoc(doc.id, doc.data()));
  const mediaIds: string[] = [...new Set<string>(records.flatMap((item) => item.mediaIds.slice(0, 1)))];
  const media = await loadMediaMap(mediaIds);
  const managedStarters = new Set<string>(records.map((item) => item.sourceStarterId).filter((value): value is string => Boolean(value)));
  const saved = records.map((item) => {
    const selected = item.mediaIds[0] ? media.get(item.mediaIds[0]) : undefined;
    const fallback = starterServiceMedia(item.sourceStarterId);
    return {
      ...item,
      thumbnail: selected?.secureUrl || fallback?.src,
      imageAlt: selected?.alt || fallback?.alt,
    };
  });
  const durable=await getStarterSuppressions("services");
  durable.forEach(id=>managedStarters.add(id));
  return [...saved, ...previewList(managedStarters)].sort((a, b) => {
    const aTime = a.updatedAt || 0;
    const bTime = b.updatedAt || 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export async function getAdminService(id: string): Promise<AdminServiceRecord | null> {
  const db = getAdminDb();
  if (!db) return starterServiceById(id);
  try {
    const snap = await db.collection("services").doc(id).get();
    if (snap.exists) return fromDoc(snap.id, snap.data() || {});
  } catch {
    return starterServiceById(id);
  }
  return (await getStarterSuppressions("services")).has(id)?null:starterServiceById(id);
}

export async function getAdminServiceMedia(ids: string[]): Promise<AdminMediaRecord[]> {
  const map = await loadMediaMap(ids);
  return ids.map((id) => map.get(id)).filter((item): item is AdminMediaRecord => Boolean(item));
}

export async function listServiceMedia(limit = 100): Promise<AdminMediaRecord[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("media").where("resourceType", "==", "image").limit(limit).get().catch(() => null);
  return snap
    ? snap.docs
        .map((doc) => mediaFromDoc(doc.id, doc.data()))
        .filter((item) => item.secureUrl && item.status !== "trashed" && item.actualItem !== true)
    : [];
}

export function serviceDraftPayload(input: Partial<AdminServiceRecord>) {
  const priceMode = priceModes.has(input.priceMode as ServicePriceMode) ? input.priceMode as ServicePriceMode : "quote";
  const sourceStarterId = typeof input.sourceStarterId === "string" && serviceDesignPreview.some((service) => service.id === input.sourceStarterId)
    ? input.sourceStarterId
    : undefined;
  return {
    ...(sourceStarterId ? { sourceStarterId } : {}),
    slug: slugifyService(input.slug || input.title || "service"),
    title: String(input.title || "").trim().slice(0, 140),
    description: String(input.description || "").trim().slice(0, 3000),
    mediaIds: Array.isArray(input.mediaIds) ? input.mediaIds.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 6) : [],
    priceMode,
    ...(Number.isInteger(input.priceMinor) && (input.priceMinor as number) >= 0 ? { priceMinor: input.priceMinor } : {}),
    ...(Number.isInteger(input.minPriceMinor) && (input.minPriceMinor as number) >= 0 ? { minPriceMinor: input.minPriceMinor } : {}),
    ...(Number.isInteger(input.maxPriceMinor) && (input.maxPriceMinor as number) >= 0 ? { maxPriceMinor: input.maxPriceMinor } : {}),
    preparation: String(input.preparation || "").trim().slice(0, 1600),
  };
}

export function servicePublishErrors(service: AdminServiceRecord, media: AdminMediaRecord[]) {
  const errors: Record<string, string> = {};
  if (!service.title.trim()) errors.title = "Service title is required.";
  if (!service.description.trim()) errors.description = "Add a short customer-facing description.";
  if (!service.slug.trim()) errors.slug = "A public service link is required.";
  const fallback = starterServiceMedia(service.sourceStarterId);
  const usableMedia = media.filter((item) => item.resourceType === "image" && item.secureUrl);
  if (!usableMedia.length && !fallback) errors.mediaIds = "Add a service image before publishing.";
  if (usableMedia.some((item) => !item.alt.trim())) errors.mediaAlt = "Every published service image needs an image description.";
  if (usableMedia.some((item) => (item.provenance === "real-work" || item.provenance === "service-media") && item.consentConfirmed !== true)) errors.mediaPermission = "Confirm you have the right to use this image publicly before publishing.";
  if (service.priceMode === "fixed" && !Number.isInteger(service.priceMinor)) errors.priceMinor = "Enter the fixed price.";
  if (service.priceMode === "from" && !Number.isInteger(service.minPriceMinor)) errors.minPriceMinor = "Enter the starting price.";
  if (service.priceMode === "range" && (!Number.isInteger(service.minPriceMinor) || !Number.isInteger(service.maxPriceMinor))) errors.range = "Enter both ends of the price range.";
  if (service.priceMode === "range" && Number.isInteger(service.minPriceMinor) && Number.isInteger(service.maxPriceMinor) && (service.minPriceMinor as number) > (service.maxPriceMinor as number)) errors.range = "The minimum price cannot be above the maximum price.";
  return errors;
}

export function publicServiceProjection(service: AdminServiceRecord, media: AdminMediaRecord[]) {
  const selected = media.find((item) => item.resourceType === "image" && item.secureUrl);
  const fallback = starterServiceMedia(service.sourceStarterId);
  const publicMedia = selected
    ? {
        kind: "image" as const,
        src: selected.secureUrl,
        alt: selected.alt,
        caption: selected.caption || "",
        focal: selected.focal ? `${Math.round(selected.focal.x * 100)}% ${Math.round(selected.focal.y * 100)}%` : "50% 50%",
      }
    : fallback
      ? { ...fallback, kind: "image" as const }
      : undefined;
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.description,
    priceMode: service.priceMode,
    ...(Number.isInteger(service.priceMinor) ? { priceMinor: service.priceMinor } : {}),
    ...(Number.isInteger(service.minPriceMinor) ? { minPriceMinor: service.minPriceMinor } : {}),
    ...(Number.isInteger(service.maxPriceMinor) ? { maxPriceMinor: service.maxPriceMinor } : {}),
    currency: "NGN",
    preparation: service.preparation,
    status: "published",
    media: publicMedia,
    sourceStarterId: service.sourceStarterId || null,
  };
}

export async function logServiceAdminAction(actor: string | undefined, action: string, entityId: string, success = true) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("adminAudit").add({ actor: actor || "admin", action, entityId, success, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
}

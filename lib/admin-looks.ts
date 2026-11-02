import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { adminTimeMillis } from "@/lib/admin-serialise";
import { publicLooks, type LookCategory, type LookProvenance, type PublicLook } from "@/lib/gallery";
import { lookCategoryLabel, lookProvenanceLabel, type AdminLookPriceMode, type AdminLookStatus } from "@/lib/look-admin-shared";
import { mediaFromDoc } from "@/lib/admin-products";
import type { AdminMediaRecord } from "@/lib/admin-product-shared";

export { lookCategoryLabel, lookProvenanceLabel };
export type { AdminLookPriceMode, AdminLookStatus };

export type { AdminLookRecord, AdminLookListItem } from "@/lib/look-admin-shared";
import type { AdminLookRecord, AdminLookListItem } from "@/lib/look-admin-shared";

const categories = new Set<LookCategory>(["braids", "wigs", "nails"]);
const provenances = new Set<LookProvenance>(["real-work", "inspiration", "campaign"]);
const priceModes = new Set<AdminLookPriceMode>(["quote", "fixed", "from", "hidden"]);

export function slugifyLook(value: string) {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "look";
}

function starterFromPublic(look: PublicLook): AdminLookRecord {
  return {
    id: look.id,
    sourceStarterId: look.id,
    reference: look.reference,
    slug: look.slug,
    title: look.title,
    category: look.category,
    caption: look.description,
    mediaIds: [],
    provenance: look.provenance,
    generated: look.generated,
    clientPermission: false,
    priceMode: "quote",
    status: "draft",
    revision: 0,
    preview: true,
  };
}

export function starterLookById(id: string): AdminLookRecord | null {
  const look = publicLooks.find((item) => item.id === id);
  return look ? starterFromPublic(look) : null;
}

export function starterLookMedia(id: string) {
  return publicLooks.find((item) => item.id === id)?.media || [];
}

function fromDoc(id: string, raw: Record<string, any>): AdminLookRecord {
  const category = typeof raw.category === "string" ? raw.category as LookCategory : "";
  const provenance = provenances.has(raw.provenance as LookProvenance) ? raw.provenance as LookProvenance : "inspiration";
  const priceMode = priceModes.has(raw.priceMode as AdminLookPriceMode) ? raw.priceMode as AdminLookPriceMode : "quote";
  return {
    id,
    sourceStarterId: typeof raw.sourceStarterId === "string" ? raw.sourceStarterId : undefined,
    suppressStarterPublic: raw.suppressStarterPublic === true,
    reference: typeof raw.reference === "string" ? raw.reference : `KEO-LOOK-${id.slice(0, 6).toUpperCase()}`,
    slug: typeof raw.slug === "string" ? raw.slug : "",
    title: typeof raw.title === "string" ? raw.title : "Untitled look",
    category,
    caption: typeof raw.caption === "string" ? raw.caption : "",
    mediaIds: Array.isArray(raw.mediaIds) ? raw.mediaIds.filter((value: unknown): value is string => typeof value === "string") : [],
    provenance,
    generated: raw.generated === true,
    clientPermission: raw.clientPermission === true,
    priceMode,
    priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : undefined,
    status: ["draft", "published", "archived", "trashed"].includes(raw.status) ? raw.status : "draft",
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
    createdAt: adminTimeMillis(raw.createdAt),
    updatedAt: adminTimeMillis(raw.updatedAt),
    deletedAt: adminTimeMillis(raw.deletedAt),
    purgeAt: adminTimeMillis(raw.purgeAt),
    purgeState: typeof raw.purgeState === "string" ? raw.purgeState : undefined,
  };
}

export async function getAdminLook(id: string): Promise<AdminLookRecord | null> {
  const db = getAdminDb();
  if (!db) return starterLookById(id);
  try {
    const snap = await db.collection("looks").doc(id).get();
    if (snap.exists) return fromDoc(snap.id, snap.data() || {});
  } catch {
    return starterLookById(id);
  }
  return (await getStarterSuppressions("looks")).has(id)?null:starterLookById(id);
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

function previewList(excludeStarterIds = new Set<string>()): AdminLookListItem[] {
  return publicLooks
    .filter((look) => !excludeStarterIds.has(look.id))
    .map((look) => ({
      ...starterFromPublic(look),
      thumbnail: look.media.find((item) => item.kind === "image")?.src || look.media[0]?.src,
      thumbnailKind: look.media.find((item) => item.kind === "image") ? "image" : look.media[0]?.kind,
      imageAlt: look.media[0]?.alt,
    }));
}

export async function getAdminLooks(): Promise<AdminLookListItem[]> {
  const db = getAdminDb();
  if (!db) return previewList();
  let snap;
  try {
    snap = await db.collection("looks").limit(250).get();
  } catch {
    return previewList();
  }
  if (snap.empty) return previewList(await getStarterSuppressions("looks"));
  const records = snap.docs.map((doc) => fromDoc(doc.id, doc.data()));
  const mediaIds = [...new Set(records.flatMap((item) => item.mediaIds.slice(0, 1)))];
  const media = await loadMediaMap(mediaIds);
  const managedStarters = new Set(records.map((item) => item.sourceStarterId).filter((value): value is string => Boolean(value)));
  const saved: AdminLookListItem[] = records.map((item) => {
    const first = item.mediaIds[0] ? media.get(item.mediaIds[0]) : undefined;
    const starter = item.sourceStarterId ? publicLooks.find((look) => look.id === item.sourceStarterId) : undefined;
    const fallback = starter?.media.find((asset) => asset.kind === "image") || starter?.media[0];
    return {
      ...item,
      thumbnail: first?.secureUrl || fallback?.src,
      thumbnailKind: first?.resourceType || fallback?.kind,
      imageAlt: first?.alt || fallback?.alt,
    };
  });
  const durable=await getStarterSuppressions("looks");
  durable.forEach(id=>managedStarters.add(id));
  const previews = previewList(managedStarters);
  return [...saved, ...previews].sort((a, b) => {
    const aTime = a.updatedAt || 0;
    const bTime = b.updatedAt || 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export async function getAdminLookMedia(ids: string[]): Promise<AdminMediaRecord[]> {
  const map = await loadMediaMap(ids);
  return ids.map((id) => map.get(id)).filter((item): item is AdminMediaRecord => Boolean(item));
}

export async function listGalleryMedia(limit = 100): Promise<AdminMediaRecord[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("media").limit(limit).get().catch(() => null);
  return snap
    ? snap.docs.map((doc) => mediaFromDoc(doc.id, doc.data())).filter((item) => item.secureUrl && item.status !== "trashed" && item.actualItem !== true && (item.resourceType === "image" || item.resourceType === "video"))
    : [];
}

export function lookDraftPayload(input: Partial<AdminLookRecord>) {
  const category = typeof input.category === "string" ? input.category as LookCategory : "";
  const provenance = provenances.has(input.provenance as LookProvenance) ? input.provenance as LookProvenance : "inspiration";
  const priceMode = priceModes.has(input.priceMode as AdminLookPriceMode) ? input.priceMode as AdminLookPriceMode : "quote";
  const sourceStarterId = typeof input.sourceStarterId === "string" && publicLooks.some((look) => look.id === input.sourceStarterId)
    ? input.sourceStarterId
    : undefined;
  return {
    ...(sourceStarterId ? { sourceStarterId } : {}),
    reference: String(input.reference || "").trim().slice(0, 80),
    slug: slugifyLook(input.slug || input.title || "look"),
    title: String(input.title || "").trim().slice(0, 140),
    category,
    caption: String(input.caption || "").trim().slice(0, 3000),
    mediaIds: Array.isArray(input.mediaIds) ? input.mediaIds.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 12) : [],
    provenance,
    generated: provenance === "real-work" ? false : input.generated === true,
    clientPermission: input.clientPermission === true,
    priceMode,
    ...(Number.isInteger(input.priceMinor) && (input.priceMinor as number) >= 0 ? { priceMinor: input.priceMinor } : {}),
  };
}

export async function logLookAdminAction(actor: string | undefined, action: string, entityId: string, success = true) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("adminAudit").add({ actor: actor || "admin", action, entityId, success, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
}

function starterPublicMedia(sourceStarterId?: string) {
  return sourceStarterId ? publicLooks.find((item) => item.id === sourceStarterId)?.media || [] : [];
}

export function lookPublishErrors(look: AdminLookRecord, media: AdminMediaRecord[]) {
  const errors: Record<string, string> = {};
  if (!look.title.trim()) errors.title = "Look title is required.";
  if (!look.category) errors.category = "Choose the look category.";
  if (!look.caption.trim()) errors.caption = "Add a short customer-facing description.";
  const bundled = starterPublicMedia(look.sourceStarterId);
  const hasMedia = media.some((item) => item.secureUrl) || bundled.length > 0;
  if (!hasMedia) errors.mediaIds = "Add at least one photo or short video before publishing.";
  if (media.some((item) => !item.alt.trim())) errors.mediaAlt = "Every published photo or video needs a description for accessibility.";
  if (look.provenance === "real-work") {
    if (!media.length) errors.mediaIds = "KEO Hairven’s work must use an owner-uploaded client photo or video, not a campaign placeholder.";
    if (!look.clientPermission) errors.clientPermission = "Confirm that you have permission before publishing identifiable client work.";
    if (media.some((item) => item.consentConfirmed !== true)) errors.clientPermission = "Confirm client permission for every selected real-work media item.";
  }
  if ((look.priceMode === "fixed" || look.priceMode === "from") && !Number.isInteger(look.priceMinor)) {
    errors.priceMinor = look.priceMode === "fixed" ? "Enter the displayed price." : "Enter the starting price.";
  }
  return errors;
}

function guidanceForCategory(category: LookCategory) {
  if (category === "nails") return [
    { title: "Make it yours", body: "Discuss shape, colour and finish on WhatsApp." },
    { title: "Before you visit", body: "Ask us about preparation and appointment availability." },
  ];
  if (category === "braids") return [
    { title: "Make it yours", body: "Discuss length, size and colour on WhatsApp." },
    { title: "Before you visit", body: "Ask us about preparation and appointment availability." },
  ];
  return [
    { title: "Make it yours", body: "Discuss the finish, length and styling direction on WhatsApp." },
    { title: "Before you visit", body: "Ask us about the exact service and appointment availability." },
  ];
}

export function publicLookProjection(look: AdminLookRecord, media: AdminMediaRecord[]) {
  const firstImage = media.find((item) => item.resourceType === "image")?.secureUrl;
  const uploaded = media.map((item) => ({
    kind: item.resourceType,
    src: item.secureUrl,
    ...(item.resourceType === "video" && firstImage ? { poster: firstImage } : {}),
    alt: item.alt || look.title,
    caption: item.caption || "",
    focal: item.focal ? `${Math.round(item.focal.x * 100)}% ${Math.round(item.focal.y * 100)}%` : "50% 50%",
  }));
  const bundled = uploaded.length ? [] : starterPublicMedia(look.sourceStarterId);
  const publicMedia = uploaded.length ? uploaded : bundled;
  return {
    id: look.id,
    reference: look.reference,
    slug: look.slug,
    title: look.title,
    titleLines: [look.title],
    category: look.category,
    categoryLabel: lookCategoryLabel(look.category as LookCategory),
    description: look.caption,
    tags: [look.category, look.provenance, ...look.title.toLowerCase().split(/\s+/)].filter(Boolean).slice(0, 12),
    provenance: look.provenance,
    provenanceLabel: lookProvenanceLabel(look.provenance, look.generated),
    generated: look.generated,
    priceMode: look.priceMode,
    ...(Number.isInteger(look.priceMinor) ? { priceMinor: look.priceMinor } : {}),
    status: "published",
    media: publicMedia,
    guidance: guidanceForCategory(look.category as LookCategory),
  };
}

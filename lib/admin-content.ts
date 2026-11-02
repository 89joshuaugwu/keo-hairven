import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { publicFaqs } from "@/lib/faqs";
import { getAdminMediaLibrary, type AdminLibraryMedia } from "@/lib/admin-media";
import {
  defaultAdminContentDraft,
  type AdminContentDraft,
  type AdminFaqRecord,
  type SiteContentMedia,
} from "@/lib/site-content";

const faqCategories = new Set(["getting-started", "appointments", "products-pricing", "waybill-delivery"]);

function fromContentDoc(raw: Record<string, any> | undefined): AdminContentDraft {
  if (!raw) return { ...defaultAdminContentDraft, rotatingPhrases: [...defaultAdminContentDraft.rotatingPhrases], suppressedFaqIds: [] };
  return {
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
    homeHeading: typeof raw.homeHeading === "string" ? raw.homeHeading : defaultAdminContentDraft.homeHeading,
    homeSupportingText: typeof raw.homeSupportingText === "string" ? raw.homeSupportingText : defaultAdminContentDraft.homeSupportingText,
    rotatingPhrases: Array.isArray(raw.rotatingPhrases) ? raw.rotatingPhrases.filter((item: unknown): item is string => typeof item === "string").slice(0, 5) : [...defaultAdminContentDraft.rotatingPhrases],
    showBeautyEdit: raw.showBeautyEdit !== false,
    showNailEditorial: raw.showNailEditorial !== false,
    showCollection: raw.showCollection !== false,
    showHowItWorks: raw.showHowItWorks !== false,
    homeHeroMediaId: typeof raw.homeHeroMediaId === "string" ? raw.homeHeroMediaId : defaultAdminContentDraft.homeHeroMediaId,
    aboutHeadingLead: typeof raw.aboutHeadingLead === "string" ? raw.aboutHeadingLead : defaultAdminContentDraft.aboutHeadingLead,
    aboutHeadingEmphasis: typeof raw.aboutHeadingEmphasis === "string" ? raw.aboutHeadingEmphasis : defaultAdminContentDraft.aboutHeadingEmphasis,
    aboutIntro: typeof raw.aboutIntro === "string" ? raw.aboutIntro : defaultAdminContentDraft.aboutIntro,
    aboutSectionLead: typeof raw.aboutSectionLead === "string" ? raw.aboutSectionLead : defaultAdminContentDraft.aboutSectionLead,
    aboutSectionEmphasis: typeof raw.aboutSectionEmphasis === "string" ? raw.aboutSectionEmphasis : defaultAdminContentDraft.aboutSectionEmphasis,
    aboutBody1: typeof raw.aboutBody1 === "string" ? raw.aboutBody1 : defaultAdminContentDraft.aboutBody1,
    aboutBody2: typeof raw.aboutBody2 === "string" ? raw.aboutBody2 : defaultAdminContentDraft.aboutBody2,
    aboutMediaId: typeof raw.aboutMediaId === "string" ? raw.aboutMediaId : defaultAdminContentDraft.aboutMediaId,
    ctaEyebrow: typeof raw.ctaEyebrow === "string" ? raw.ctaEyebrow : defaultAdminContentDraft.ctaEyebrow,
    ctaHeadingLead: typeof raw.ctaHeadingLead === "string" ? raw.ctaHeadingLead : defaultAdminContentDraft.ctaHeadingLead,
    ctaHeadingEmphasis: typeof raw.ctaHeadingEmphasis === "string" ? raw.ctaHeadingEmphasis : defaultAdminContentDraft.ctaHeadingEmphasis,
    ctaBody: typeof raw.ctaBody === "string" ? raw.ctaBody : defaultAdminContentDraft.ctaBody,
    ctaButtonLabel: typeof raw.ctaButtonLabel === "string" ? raw.ctaButtonLabel : defaultAdminContentDraft.ctaButtonLabel,
    suppressedFaqIds: Array.isArray(raw.suppressedFaqIds) ? raw.suppressedFaqIds.filter((item: unknown): item is string => typeof item === "string") : [],
  };
}

function starterFaqs(suppressed = new Set<string>()): AdminFaqRecord[] {
  return publicFaqs
    .filter((faq) => !suppressed.has(faq.id))
    .map((faq, index) => ({
      ...faq,
      sourceStarterId: faq.id,
      sortOrder: index + 1,
      status: "draft" as const,
      revision: 0,
      preview: true,
    }));
}

function faqFromDoc(id: string, raw: Record<string, any>): AdminFaqRecord {
  return {
    purgeAt: typeof raw.purgeAt?.toMillis === "function" ? raw.purgeAt.toMillis() : undefined,
    purgeState: raw.purgeState,
    id,
    sourceStarterId: typeof raw.sourceStarterId === "string" ? raw.sourceStarterId : undefined,
    category: faqCategories.has(raw.group) ? raw.group : "getting-started",
    question: typeof raw.question === "string" ? raw.question : "",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    sortOrder: Number.isFinite(raw.sortOrder) ? Number(raw.sortOrder) : 100,
    status: raw.status === "published" || raw.status === "trashed" ? raw.status : "draft",
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
  };
}

export async function getAdminContentBundle() {
  const db = getAdminDb();
  if (!db) {
    const content = { ...defaultAdminContentDraft, rotatingPhrases: [...defaultAdminContentDraft.rotatingPhrases], suppressedFaqIds: [] };
    return { content, faqs: starterFaqs(), trashedFaqs: [] as AdminFaqRecord[], media: await getAdminMediaLibrary(true) };
  }

  try {
    const [contentSnap, faqSnap, media] = await Promise.all([
      db.collection("settingsDrafts").doc("site").get(),
      db.collection("faqs").limit(100).get(),
      getAdminMediaLibrary(true),
    ]);
    const content = fromContentDoc(contentSnap.exists ? contentSnap.data() : undefined);
    const suppressed = new Set([...content.suppressedFaqIds,...await getStarterSuppressions("faqs")]);
    const saved = faqSnap.docs.map((doc) => faqFromDoc(doc.id, doc.data()));
    const managedStarterIds = new Set(saved.map((faq) => faq.sourceStarterId || (publicFaqs.some((item) => item.id === faq.id) ? faq.id : "")).filter(Boolean));
    const fallback = starterFaqs(new Set([...suppressed, ...managedStarterIds]));
    const faqs = [...saved, ...fallback]
      .filter((faq) => faq.status !== "trashed")
      .sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question));
    const trashedFaqs = saved
      .filter((faq) => faq.status === "trashed")
      .sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question));
    return { content, faqs, trashedFaqs, media };
  } catch {
    const content = { ...defaultAdminContentDraft, rotatingPhrases: [...defaultAdminContentDraft.rotatingPhrases], suppressedFaqIds: [] };
    return { content, faqs: starterFaqs(), trashedFaqs: [] as AdminFaqRecord[], media: await getAdminMediaLibrary(true) };
  }
}

export function faqDraftPayload(input: Partial<AdminFaqRecord>, sortOrder: number) {
  const category = typeof input.category === "string" && faqCategories.has(input.category) ? input.category as AdminFaqRecord["category"] : "getting-started";
  return {
    sourceStarterId: typeof input.sourceStarterId === "string" && publicFaqs.some((faq) => faq.id === input.sourceStarterId) ? input.sourceStarterId : null,
    question: String(input.question || "").trim().slice(0, 180),
    answer: String(input.answer || "").trim().slice(0, 1400),
    group: category,
    sortOrder: Math.max(1, Math.min(100, Math.trunc(sortOrder))),
  };
}

function focalString(media: AdminLibraryMedia) {
  return `${Math.round(media.focal.x * 100)}% ${Math.round(media.focal.y * 100)}%`;
}

export function mediaToPublicContent(media: AdminLibraryMedia | undefined, fallback: SiteContentMedia): SiteContentMedia {
  if (!media?.secureUrl || media.status !== "active") return fallback;
  const kind = media.resourceType;
  const poster = kind === "video"
    ? fallback.poster
    : undefined;
  return {
    id: media.id,
    kind,
    src: media.secureUrl,
    ...(poster ? { poster } : {}),
    alt: media.alt || fallback.alt,
    caption: media.caption || fallback.caption,
    focal: focalString(media),
    generated: media.generated,
  };
}

export async function logContentAdminAction(actor: string | undefined, action: string, entityId = "site", success = true) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("adminAudit").add({ actor: actor || "admin", action, entityId, success, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
}

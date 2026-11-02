import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { defaultPublicSiteContent, type PublicSiteContent, type SiteContentMedia } from "@/lib/site-content";

function mediaFromRaw(raw: unknown, fallback: SiteContentMedia): SiteContentMedia {
  if (!raw || typeof raw !== "object") return fallback;
  const item = raw as Record<string, unknown>;
  const src = typeof item.src === "string" && item.src ? item.src : fallback.src;
  return {
    id: typeof item.id === "string" ? item.id : fallback.id,
    kind: item.kind === "image" ? "image" : item.kind === "video" ? "video" : fallback.kind,
    src,
    poster: typeof item.poster === "string" && item.poster ? item.poster : fallback.poster,
    alt: typeof item.alt === "string" && item.alt ? item.alt : fallback.alt,
    caption: typeof item.caption === "string" ? item.caption : fallback.caption,
    focal: typeof item.focal === "string" ? item.focal : fallback.focal,
    generated: typeof item.generated === "boolean" ? item.generated : fallback.generated,
  };
}

function contentFromRaw(raw: unknown): PublicSiteContent {
  if (!raw || typeof raw !== "object") return defaultPublicSiteContent;
  const data = raw as Record<string, any>;
  const phrases = Array.isArray(data.rotatingPhrases)
    ? data.rotatingPhrases.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
    : defaultPublicSiteContent.rotatingPhrases;
  return {
    published: data.published === true,
    revision: Number.isInteger(data.revision) ? data.revision : 0,
    homeHeading: typeof data.homeHeading === "string" && data.homeHeading.trim() ? data.homeHeading : defaultPublicSiteContent.homeHeading,
    homeSupportingText: typeof data.homeSupportingText === "string" && data.homeSupportingText.trim() ? data.homeSupportingText : defaultPublicSiteContent.homeSupportingText,
    rotatingPhrases: phrases.length ? phrases : defaultPublicSiteContent.rotatingPhrases,
    showBeautyEdit: data.showBeautyEdit !== false,
    showNailEditorial: data.showNailEditorial !== false,
    showCollection: data.showCollection !== false,
    showHowItWorks: data.showHowItWorks !== false,
    homeHeroMedia: mediaFromRaw(data.homeHeroMedia, defaultPublicSiteContent.homeHeroMedia),
    aboutHeadingLead: typeof data.aboutHeadingLead === "string" && data.aboutHeadingLead.trim() ? data.aboutHeadingLead : defaultPublicSiteContent.aboutHeadingLead,
    aboutHeadingEmphasis: typeof data.aboutHeadingEmphasis === "string" && data.aboutHeadingEmphasis.trim() ? data.aboutHeadingEmphasis : defaultPublicSiteContent.aboutHeadingEmphasis,
    aboutIntro: typeof data.aboutIntro === "string" && data.aboutIntro.trim() ? data.aboutIntro : defaultPublicSiteContent.aboutIntro,
    aboutSectionLead: typeof data.aboutSectionLead === "string" && data.aboutSectionLead.trim() ? data.aboutSectionLead : defaultPublicSiteContent.aboutSectionLead,
    aboutSectionEmphasis: typeof data.aboutSectionEmphasis === "string" && data.aboutSectionEmphasis.trim() ? data.aboutSectionEmphasis : defaultPublicSiteContent.aboutSectionEmphasis,
    aboutBody1: typeof data.aboutBody1 === "string" && data.aboutBody1.trim() ? data.aboutBody1 : defaultPublicSiteContent.aboutBody1,
    aboutBody2: typeof data.aboutBody2 === "string" ? data.aboutBody2 : defaultPublicSiteContent.aboutBody2,
    aboutMedia: mediaFromRaw(data.aboutMedia, defaultPublicSiteContent.aboutMedia),
    ctaEyebrow: typeof data.ctaEyebrow === "string" && data.ctaEyebrow.trim() ? data.ctaEyebrow : defaultPublicSiteContent.ctaEyebrow,
    ctaHeadingLead: typeof data.ctaHeadingLead === "string" && data.ctaHeadingLead.trim() ? data.ctaHeadingLead : defaultPublicSiteContent.ctaHeadingLead,
    ctaHeadingEmphasis: typeof data.ctaHeadingEmphasis === "string" && data.ctaHeadingEmphasis.trim() ? data.ctaHeadingEmphasis : defaultPublicSiteContent.ctaHeadingEmphasis,
    ctaBody: typeof data.ctaBody === "string" && data.ctaBody.trim() ? data.ctaBody : defaultPublicSiteContent.ctaBody,
    ctaButtonLabel: typeof data.ctaButtonLabel === "string" && data.ctaButtonLabel.trim() ? data.ctaButtonLabel : defaultPublicSiteContent.ctaButtonLabel,
  };
}

export async function getPublicSiteContentServer(): Promise<PublicSiteContent> {
  const db = getAdminDb();
  if (!db) return defaultPublicSiteContent;
  try {
    const snap = await db.collection("publicSettings").doc("site").get();
    if (!snap.exists) return defaultPublicSiteContent;
    return contentFromRaw(snap.data()?.content);
  } catch {
    return defaultPublicSiteContent;
  }
}

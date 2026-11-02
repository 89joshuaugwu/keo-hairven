import type { FaqItem } from "@/lib/faqs";

export type SiteContentMedia = {
  id?: string;
  kind: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
  caption?: string;
  focal?: string;
  generated?: boolean;
};

export type PublicSiteContent = {
  published: boolean;
  revision: number;
  homeHeading: string;
  homeSupportingText: string;
  rotatingPhrases: string[];
  showBeautyEdit: boolean;
  showNailEditorial: boolean;
  showCollection: boolean;
  showHowItWorks: boolean;
  homeHeroMedia: SiteContentMedia;
  aboutHeadingLead: string;
  aboutHeadingEmphasis: string;
  aboutIntro: string;
  aboutSectionLead: string;
  aboutSectionEmphasis: string;
  aboutBody1: string;
  aboutBody2: string;
  aboutMedia: SiteContentMedia;
  ctaEyebrow: string;
  ctaHeadingLead: string;
  ctaHeadingEmphasis: string;
  ctaBody: string;
  ctaButtonLabel: string;
};

export type AdminContentDraft = Omit<PublicSiteContent, "published" | "homeHeroMedia" | "aboutMedia"> & {
  homeHeroMediaId: string;
  aboutMediaId: string;
  suppressedFaqIds: string[];
};

export type AdminFaqRecord = FaqItem & {
  purgeAt?:number;
  purgeState?:string;
  sortOrder: number;
  status: "draft" | "published" | "trashed";
  revision: number;
  preview?: boolean;
  sourceStarterId?: string;
};

export const DEFAULT_HOME_HERO_MEDIA_ID = "starter-video-hero-hair";
export const DEFAULT_ABOUT_MEDIA_ID = "starter-waves-campaign";

export const defaultPublicSiteContent: PublicSiteContent = {
  published: false,
  revision: 0,
  homeHeading: "Confidence in\nevery strand.",
  homeSupportingText: "For every version of you. Discover wigs, extensions and bundles that make a look feel like your own.",
  rotatingPhrases: ["All you.", "Your mood.", "Your moment."],
  showBeautyEdit: true,
  showNailEditorial: true,
  showCollection: true,
  showHowItWorks: true,
  homeHeroMedia: {
    id: DEFAULT_HOME_HERO_MEDIA_ID,
    kind: "video",
    src: "/assets/videos/01-hero-hair.mp4",
    poster: "/assets/campaign/waves-campaign.webp",
    alt: "Campaign inspiration showing an adult woman with long glossy black waves",
    caption: "",
    focal: "50% 30%",
    generated: true,
  },
  aboutHeadingLead: "Confidence in\nevery",
  aboutHeadingEmphasis: "strand.",
  aboutIntro: "KEO Hairven is a hair-focused brand offering wigs, extensions, bundles and beautiful hair choices.",
  aboutSectionLead: "Wear your",
  aboutSectionEmphasis: "confidence.",
  aboutBody1: "Explore the collection, compare hair options and speak with us directly about your preferences.",
  aboutBody2: "From the first look to the final details, we want your choice to feel considered and personal. Ask us about the options you love, and confirm availability and delivery before you buy.",
  aboutMedia: {
    id: DEFAULT_ABOUT_MEDIA_ID,
    kind: "image",
    src: "/assets/campaign/waves-campaign.webp",
    poster: "/assets/campaign/waves-campaign.webp",
    alt: "Editorial inspiration: long glossy black hair",
    caption: "",
    focal: "50% 47%",
    generated: true,
  },
  ctaEyebrow: "READY FOR YOUR NEXT LOOK?",
  ctaHeadingLead: "See something you",
  ctaHeadingEmphasis: "love?",
  ctaBody: "Find a favourite? Get in touch to confirm hair details, availability and delivery.",
  ctaButtonLabel: "Chat on WhatsApp",
};

export const defaultAdminContentDraft: AdminContentDraft = {
  revision: 0,
  homeHeading: defaultPublicSiteContent.homeHeading,
  homeSupportingText: defaultPublicSiteContent.homeSupportingText,
  rotatingPhrases: [...defaultPublicSiteContent.rotatingPhrases],
  showBeautyEdit: true,
  showNailEditorial: true,
  showCollection: true,
  showHowItWorks: true,
  homeHeroMediaId: DEFAULT_HOME_HERO_MEDIA_ID,
  aboutHeadingLead: defaultPublicSiteContent.aboutHeadingLead,
  aboutHeadingEmphasis: defaultPublicSiteContent.aboutHeadingEmphasis,
  aboutIntro: defaultPublicSiteContent.aboutIntro,
  aboutSectionLead: defaultPublicSiteContent.aboutSectionLead,
  aboutSectionEmphasis: defaultPublicSiteContent.aboutSectionEmphasis,
  aboutBody1: defaultPublicSiteContent.aboutBody1,
  aboutBody2: defaultPublicSiteContent.aboutBody2,
  aboutMediaId: DEFAULT_ABOUT_MEDIA_ID,
  ctaEyebrow: defaultPublicSiteContent.ctaEyebrow,
  ctaHeadingLead: defaultPublicSiteContent.ctaHeadingLead,
  ctaHeadingEmphasis: defaultPublicSiteContent.ctaHeadingEmphasis,
  ctaBody: defaultPublicSiteContent.ctaBody,
  ctaButtonLabel: defaultPublicSiteContent.ctaButtonLabel,
  suppressedFaqIds: [],
};

const clean = (value: unknown, max: number, fallback = "") => typeof value === "string" ? value.trim().slice(0, max) : fallback;

export function sanitiseContentDraft(input: Partial<AdminContentDraft>): Omit<AdminContentDraft, "revision"> {
  const phrases = Array.isArray(input.rotatingPhrases)
    ? input.rotatingPhrases.map((item) => clean(item, 48)).filter(Boolean).slice(0, 5)
    : [];
  return {
    homeHeading: clean(input.homeHeading, 140, defaultAdminContentDraft.homeHeading),
    homeSupportingText: clean(input.homeSupportingText, 320, defaultAdminContentDraft.homeSupportingText),
    rotatingPhrases: phrases.length ? phrases : [...defaultAdminContentDraft.rotatingPhrases],
    showBeautyEdit: input.showBeautyEdit !== false,
    showNailEditorial: input.showNailEditorial !== false,
    showCollection: input.showCollection !== false,
    showHowItWorks: input.showHowItWorks !== false,
    homeHeroMediaId: clean(input.homeHeroMediaId, 120, DEFAULT_HOME_HERO_MEDIA_ID),
    aboutHeadingLead: clean(input.aboutHeadingLead, 120, defaultAdminContentDraft.aboutHeadingLead),
    aboutHeadingEmphasis: clean(input.aboutHeadingEmphasis, 70, defaultAdminContentDraft.aboutHeadingEmphasis),
    aboutIntro: clean(input.aboutIntro, 360, defaultAdminContentDraft.aboutIntro),
    aboutSectionLead: clean(input.aboutSectionLead, 100, defaultAdminContentDraft.aboutSectionLead),
    aboutSectionEmphasis: clean(input.aboutSectionEmphasis, 100, defaultAdminContentDraft.aboutSectionEmphasis),
    aboutBody1: clean(input.aboutBody1, 1200, defaultAdminContentDraft.aboutBody1),
    aboutBody2: clean(input.aboutBody2, 1200, defaultAdminContentDraft.aboutBody2),
    aboutMediaId: clean(input.aboutMediaId, 120, DEFAULT_ABOUT_MEDIA_ID),
    ctaEyebrow: clean(input.ctaEyebrow, 70, defaultAdminContentDraft.ctaEyebrow),
    ctaHeadingLead: clean(input.ctaHeadingLead, 90, defaultAdminContentDraft.ctaHeadingLead),
    ctaHeadingEmphasis: clean(input.ctaHeadingEmphasis, 60, defaultAdminContentDraft.ctaHeadingEmphasis),
    ctaBody: clean(input.ctaBody, 280, defaultAdminContentDraft.ctaBody),
    ctaButtonLabel: clean(input.ctaButtonLabel, 60, defaultAdminContentDraft.ctaButtonLabel),
    suppressedFaqIds: Array.isArray(input.suppressedFaqIds)
      ? [...new Set(input.suppressedFaqIds.filter((item): item is string => typeof item === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(item)))].slice(0, 40)
      : [],
  };
}

export function contentPublishErrors(content: Omit<AdminContentDraft, "revision">, faqs: AdminFaqRecord[]) {
  const fieldErrors: Record<string, string> = {};
  if (!content.homeHeading.trim()) fieldErrors.homeHeading = "Add the homepage heading.";
  if (!content.homeSupportingText.trim()) fieldErrors.homeSupportingText = "Add the homepage supporting text.";
  if (!content.rotatingPhrases.length) fieldErrors.rotatingPhrases = "Add at least one rotating phrase.";
  if (!content.aboutHeadingLead.trim() || !content.aboutHeadingEmphasis.trim()) fieldErrors.aboutHeading = "Complete the About heading.";
  if (!content.aboutIntro.trim() || !content.aboutBody1.trim()) fieldErrors.aboutText = "Complete the About introduction and story text.";
  if (!content.ctaHeadingLead.trim() || !content.ctaHeadingEmphasis.trim() || !content.ctaBody.trim() || !content.ctaButtonLabel.trim()) fieldErrors.cta = "Complete the shared WhatsApp call-to-action copy.";
  const activeFaqs = faqs.filter((faq) => faq.status !== "trashed");
  if (!activeFaqs.length) fieldErrors.faqs = "Keep at least one FAQ or add a replacement before publishing.";
  for (const faq of activeFaqs) {
    if (!faq.question.trim() || !faq.answer.trim()) {
      fieldErrors[`faq:${faq.id}`] = "Every published FAQ needs both a question and an answer.";
      break;
    }
  }
  return fieldErrors;
}

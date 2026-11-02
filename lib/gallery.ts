import { getSiteUrl } from "@/lib/site-url";
export type LookCategory = string;
export type LookProvenance = "inspiration" | "campaign" | "real-work";
export type LookMedia = {
  kind: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
  caption: string;
  focal?: string;
};

export type PublicLook = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  titleLines: [string, string?];
  category: LookCategory;
  categoryLabel: string;
  description: string;
  tags: string[];
  provenance: LookProvenance;
  provenanceLabel: string;
  generated: boolean;
  priceMode: "quote" | "fixed" | "from" | "hidden";
  priceMinor?: number;
  status: "published";
  media: LookMedia[];
  guidance: {
    title: string;
    body: string;
  }[];
};

/**
 * Bundled campaign inspiration used by the design handoff before Firestore is connected.
 * These records contain no claims of completed client work and remain explicitly labelled.
 */
export const publicLooks: PublicLook[] = [
  {
    id: "campaign-braids-01",
    reference: "KEO-LOOK-001",
    slug: "beautifully-braided",
    title: "Beautifully braided",
    titleLines: ["Beautifully", "braided."],
    category: "braids",
    categoryLabel: "Braids",
    description:
      "A neat braided look to inspire your next hair look. Send us the reference and we’ll discuss the details.",
    tags: ["braids", "black braids", "long braids", "style inspiration"],
    provenance: "inspiration",
    provenanceLabel: "Gallery look",
    generated: true,
    priceMode: "quote",
    status: "published",
    media: [
      {
        kind: "image",
        src: "/assets/campaign/braids-inspiration.webp",
        alt: "Style inspiration showing an adult woman with long neat black braids",
        caption: "",
        focal: "50% 45%",
      },
      {
        kind: "video",
        src: "/assets/videos/04-braid-detail.mp4",
        poster: "/assets/campaign/braids-inspiration.webp",
        alt: "Short campaign motion study of black braids on an adult woman",
        caption: "",
        focal: "50% 38%",
      },
    ],
    guidance: [
      {
        title: "Make it yours",
        body: "Discuss length, size and colour on WhatsApp.",
      },
      {
        title: "Before you visit",
        body: "Ask us which hair options are available.",
      },
    ],
  },
  {
    id: "campaign-waves-01",
    reference: "KEO-LOOK-002",
    slug: "soft-wave-mood",
    title: "Soft-wave mood",
    titleLines: ["Soft-wave", "mood."],
    category: "wigs",
    categoryLabel: "Wigs & styling",
    description:
      "Soft, glossy waves as a styling reference. Send us this look and ask what options are currently available.",
    tags: ["wigs", "waves", "soft waves", "hair styling", "style inspiration"],
    provenance: "campaign",
    provenanceLabel: "Gallery look",
    generated: true,
    priceMode: "quote",
    status: "published",
    media: [
      {
        kind: "image",
        src: "/assets/campaign/waves-campaign.webp",
        alt: "Campaign inspiration showing an adult woman with long glossy black waves",
        caption: "",
        focal: "50% 35%",
      },
    ],
    guidance: [
      {
        title: "Make it yours",
        body: "Discuss the finish, length and styling direction on WhatsApp.",
      },
      {
        title: "Before you visit",
        body: "Ask us about similar available hair products.",
      },
    ],
  },

];

export function getLookBySlug(slug: string) {
  return publicLooks.find((look) => look.slug === slug && look.status === "published");
}

export function lookCanonicalUrl(slug: string) {
  const base = getSiteUrl();
  return `${base}/gallery/${slug}`;
}

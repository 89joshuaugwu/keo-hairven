import { getSiteUrl } from "@/lib/site-url";
export type ServicePriceMode = "fixed" | "from" | "range" | "hidden" | "quote";

export type ServiceMedia = {
  kind?: "image" | "video";
  src: string;
  alt: string;
  caption: string;
  focal?: string;
  poster?: string;
};

export type ServiceFamily = {
  id: string;
  slug: string;
  title?: string;
  indexLabel: string;
  categoryLabel: string;
  listTitle: string;
  listTitleEmphasis?: string;
  listDescription: string;
  buttonLabel: string;
  detailEyebrow: string;
  titleLines: [string, string?];
  detailDescription: string;
  detailPriceLabel: string;
  ideaPlaceholder: string;
  guideRows: { title: string; body: string }[];
  media: ServiceMedia;
  priceMode: ServicePriceMode;
  priceMinor?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  preparation?: string;
  status: "published" | "design-preview";
};

export const serviceDesignPreview: ServiceFamily[] = [
  {
    id: "svc-hair",
    slug: "hair-styling",
    title: "Braids & styling",
    indexLabel: "01 / HAIR",
    categoryLabel: "Braids & styling",
    listTitle: "Braids & styling",
    listDescription:
      "Bring a reference or browse our inspiration. Discuss the style, length, preparation and price with KEO Hairven.",
    buttonLabel: "Explore hair services",
    detailEyebrow: "BRAIDS & STYLING",
    titleLines: ["Braids & styling.", "Your next look."],
    detailDescription:
      "Bring a reference or tell us the braid or styling direction you prefer. We’ll discuss the look, preparation and the details with you on WhatsApp.",
    detailPriceLabel: "Price on enquiry",
    ideaPlaceholder: "e.g. Knotless braids, waist length, medium size",
    guideRows: [
      {
        title: "What to send",
        body: "Share your preferred braid size, length, colour or a link to the look you love.",
      },
      {
        title: "Before you visit",
        body: "Ask about preparation and appointment availability on WhatsApp.",
      },
    ],
    media: {
      kind: "image",
      src: "/assets/campaign/braids-inspiration.webp",
      alt: "Style inspiration showing an adult woman with long neat black braids",
      caption: "",
      focal: "50% 45%",
    },
    priceMode: "quote",
    preparation: "Ask about preparation and appointment availability on WhatsApp.",
    status: "design-preview",
  },
  {
    id: "svc-nails",
    slug: "nail-styling",
    title: "Nail styling",
    indexLabel: "02 / NAILS",
    categoryLabel: "Nail styling",
    listTitle: "A little nail",
    listTitleEmphasis: "magic.",
    listDescription:
      "From a simple finish to an expressive set. Send the look you love and ask for a quote.",
    buttonLabel: "Explore nail services",
    detailEyebrow: "NAIL STYLING",
    titleLines: ["Let your hands", "do the talking."],
    detailDescription:
      "Choose your inspiration. We’ll help you discuss the finish, shape and details for your next set.",
    detailPriceLabel: "Price on enquiry",
    ideaPlaceholder: "e.g. Blush pink, almond shape",
    guideRows: [
      {
        title: "Make it yours",
        body: "Discuss the finish, shape and colour you want on WhatsApp.",
      },
      {
        title: "Before you visit",
        body: "Ask us about preparation and appointment availability.",
      },
    ],
    media: {
      kind: "image",
      src: "/assets/campaign/nails-inspiration.webp",
      alt: "Nail inspiration showing glossy blush nails with gold details on pink satin",
      caption: "",
      focal: "50% 50%",
    },
    priceMode: "quote",
    preparation: "Ask us about preparation and appointment availability.",
    status: "design-preview",
  },
];

export function formatServicePrice(
  service: Pick<ServiceFamily, "priceMode" | "priceMinor" | "minPriceMinor" | "maxPriceMinor">
) {
  const format = (minor: number) => new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
  if (service.priceMode === "fixed" && Number.isInteger(service.priceMinor)) return format(service.priceMinor as number);
  if (service.priceMode === "from" && Number.isInteger(service.minPriceMinor)) return `From ${format(service.minPriceMinor as number)}`;
  if (service.priceMode === "range" && Number.isInteger(service.minPriceMinor) && Number.isInteger(service.maxPriceMinor)) return `${format(service.minPriceMinor as number)} – ${format(service.maxPriceMinor as number)}`;
  if (service.priceMode === "hidden") return "Price on request";
  return "Price on enquiry";
}

export function serviceCanonicalUrl(slug: string) {
  const base = getSiteUrl();
  return `${base}/services/${slug}`;
}

function formatPreferredDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

export function serviceEnquiryMessage(service: ServiceFamily, preferredDate?: string, idea?: string) {
  const lines = [`Hi KEO Hairven! I’d like to discuss ${service.categoryLabel.toLowerCase()}.`];
  if (preferredDate) lines.push(`Preferred date: ${formatPreferredDate(preferredDate)}.`);
  if (idea) lines.push(`My idea: ${idea}.`);
  lines.push("Please confirm availability and price.");
  lines.push(serviceCanonicalUrl(service.slug));
  return lines.join("\n");
}

import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { serviceDesignPreview, formatServicePrice, type ServiceFamily, type ServiceMedia, type ServicePriceMode } from "@/lib/services";

function cleanMedia(raw: unknown): ServiceMedia | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.src !== "string" || !item.src) return null;
  return {
    kind: item.kind === "video" ? "video" : "image",
    src: item.src,
    alt: typeof item.alt === "string" ? item.alt : "Service image",
    caption: typeof item.caption === "string" ? item.caption : "Service image",
    focal: typeof item.focal === "string" ? item.focal : "50% 50%",
    poster: typeof item.poster === "string" ? item.poster : undefined,
  };
}

function fromDoc(id: string, raw: Record<string, any>): ServiceFamily | null {
  if (typeof raw.slug !== "string" || typeof raw.title !== "string" || typeof raw.description !== "string") return null;
  const priceMode: ServicePriceMode = ["fixed", "from", "range", "hidden", "quote"].includes(raw.priceMode) ? raw.priceMode : "quote";
  const media = cleanMedia(raw.media);
  if (!media) return null;
  const title = raw.title.trim();
  const slug = raw.slug.trim();
  const knownHair = slug === "hair-styling";
  const knownNails = slug === "nail-styling";
  const priceFields = {
    priceMode,
    priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : undefined,
    minPriceMinor: Number.isInteger(raw.minPriceMinor) ? raw.minPriceMinor : undefined,
    maxPriceMinor: Number.isInteger(raw.maxPriceMinor) ? raw.maxPriceMinor : undefined,
  };
  const base: ServiceFamily = {
    id,
    slug,
    title,
    indexLabel: knownHair ? "01 / HAIR" : knownNails ? "02 / NAILS" : "SERVICE",
    categoryLabel: title,
    listTitle: knownNails ? "A little nail" : title,
    listTitleEmphasis: knownNails ? "magic." : undefined,
    listDescription: raw.description,
    buttonLabel: knownHair ? "Explore hair services" : knownNails ? "Explore nail services" : "Explore service",
    detailEyebrow: title.toUpperCase(),
    titleLines: knownHair ? ["Braids & styling.", "Your next look."] : knownNails ? ["Let your hands", "do the talking."] : [title],
    detailDescription: raw.description,
    detailPriceLabel: "",
    ideaPlaceholder: knownHair ? "e.g. Knotless braids, waist length, medium size" : knownNails ? "e.g. Blush pink, almond shape" : "Tell us the look or details you have in mind",
    guideRows: [
      { title: "What to send", body: "Share the style, finish or reference you want to discuss with KEO Hairven." },
      { title: "Before you visit", body: typeof raw.preparation === "string" && raw.preparation.trim() ? raw.preparation.trim() : "Ask KEO about preparation and appointment availability." },
    ],
    media,
    ...priceFields,
    preparation: typeof raw.preparation === "string" ? raw.preparation : "",
    status: "published",
  };
  base.detailPriceLabel = formatServicePrice(base);
  return base;
}

async function suppressedStarterIds() {
  const db = getAdminDb();
  if (!db) return new Set<string>();
  try {
    const snap = await db.collection("services").get();
    const durable=await getStarterSuppressions("services");
    return new Set([ ...durable, ...
      snap.docs
        .map((doc) => doc.data())
        .filter((data) => data.suppressStarterPublic === true)
        .map((data) => data.sourceStarterId)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    ]);
  } catch {
    return new Set<string>();
  }
}

export async function getPublicServicesServer(): Promise<ServiceFamily[]> {
  const db = getAdminDb();
  if (!db) return serviceDesignPreview;
  try {
    const [snap, suppressed] = await Promise.all([
      db.collection("publicServices").limit(200).get(),
      suppressedStarterIds(),
    ]);
    const live = snap.docs.map((doc) => fromDoc(doc.id, doc.data())).filter((item): item is ServiceFamily => Boolean(item));
    const baseline = serviceDesignPreview.filter((service) => !suppressed.has(service.id));
    const bySlug = new Map<string, ServiceFamily>();
    baseline.forEach((service) => bySlug.set(service.slug, service));
    live.forEach((service) => bySlug.set(service.slug, service));
    return [...bySlug.values()];
  } catch {
    return [];
  }
}

export async function getPublicServiceBySlugServer(slug: string) {
  const services = await getPublicServicesServer();
  return services.find((service) => service.slug === slug);
}

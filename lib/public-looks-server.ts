import {getStarterSuppressions} from "@/lib/categories-server";
import { getCategoryRegistry } from "@/lib/categories-server";
import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { publicLooks, type LookCategory, type LookMedia, type LookProvenance, type PublicLook } from "@/lib/gallery";

function validMedia(raw: unknown): LookMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const media = entry as Record<string, unknown>;
    const kind: LookMedia["kind"] = media.kind === "video" ? "video" : "image";
    return {
      kind,
      src: typeof media.src === "string" ? media.src : "",
      poster: typeof media.poster === "string" ? media.poster : undefined,
      alt: typeof media.alt === "string" ? media.alt : "Gallery look",
      caption: typeof media.caption === "string" ? media.caption : "",
      focal: typeof media.focal === "string" ? media.focal : "50% 50%",
    };
  }).filter((item) => item.src);
}

function fromDoc(id: string, raw: Record<string, any>): PublicLook | null {
  if (raw.status !== "published" || typeof raw.slug !== "string" || typeof raw.title !== "string") return null;
  const category: LookCategory | null = typeof raw.category === "string" ? raw.category : null;
  const provenance: LookProvenance | null = ["real-work", "inspiration", "campaign"].includes(raw.provenance) ? raw.provenance : null;
  if (!category || category === "nails" || !provenance) return null;
  const priceMode = ["quote", "fixed", "from", "hidden"].includes(raw.priceMode) ? raw.priceMode : "quote";
  const media = validMedia(raw.media);
  if (!media.length) return null;
  return {
    id,
    reference: typeof raw.reference === "string" ? raw.reference : `KEO-LOOK-${id.slice(0,6).toUpperCase()}`,
    slug: raw.slug,
    title: raw.title,
    titleLines: Array.isArray(raw.titleLines) && raw.titleLines.length ? [String(raw.titleLines[0]), raw.titleLines[1] ? String(raw.titleLines[1]) : undefined] : [raw.title],
    category,
    categoryLabel: typeof raw.categoryLabel === "string" ? raw.categoryLabel : category === "wigs" ? "Wigs & Hair" : category === "braids" ? "Braids" : "Hair",
    description: typeof raw.description === "string" ? raw.description : "Ask KEO to discuss the details of this look.",
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
    provenance,
    provenanceLabel: typeof raw.provenanceLabel === "string" ? raw.provenanceLabel : provenance === "real-work" ? "KEO Hairven’s work" : "Style inspiration",
    generated: raw.generated === true,
    priceMode,
    priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : undefined,
    status: "published",
    media,
    guidance: Array.isArray(raw.guidance) ? raw.guidance.map((item: Record<string, unknown>) => ({ title: String(item.title || "Details"), body: String(item.body || "Ask KEO on WhatsApp.") })).slice(0,4) : [],
  };
}

async function suppressedStarterIds() {
  const db = getAdminDb();
  if (!db) return new Set<string>();
  try {
    const snap = await db.collection("looks").get();
    const durable=await getStarterSuppressions("looks");
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

export async function getPublicLooksServer(): Promise<PublicLook[]> {
  const db = getAdminDb();
  if (!db) return publicLooks;
  try {
    const [snap, suppressed] = await Promise.all([db.collection("publicLooks").limit(250).get(), suppressedStarterIds()]);
    const live = snap.docs.map((doc) => fromDoc(doc.id, doc.data())).filter((item): item is PublicLook => Boolean(item));
    const baseline = publicLooks.filter((look) => !suppressed.has(look.id));
    const bySlug = new Map<string, PublicLook>();
    baseline.forEach((look) => bySlug.set(look.slug, look));
    live.forEach((look) => bySlug.set(look.slug, look));
    const registry=await getCategoryRegistry("gallery");
    return [...bySlug.values()].map(look=>({...look,categoryLabel:registry.entries.find(e=>e.id===look.category)?.label||look.categoryLabel}));
  } catch {
    return [];
  }
}

export async function getPublicLookBySlugServer(slug: string): Promise<PublicLook | undefined> {
  const looks = await getPublicLooksServer();
  return looks.find((look) => look.slug === slug && look.status === "published");
}

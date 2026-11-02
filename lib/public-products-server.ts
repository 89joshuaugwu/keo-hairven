import {getStarterSuppressions,getCategoryRegistry} from "@/lib/categories-server";
import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getBrowseProducts,
  getProductDetailBySlug,
  type BrowseProduct,
  type ProductDetailModel,
  type ProductMedia,
  type ProductVariant,
} from "@/lib/products";

function validMedia(raw: unknown): ProductMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const media = item as Record<string, unknown>;
    return {
      src: typeof media.src === "string" ? media.src : "",
      alt: typeof media.alt === "string" ? media.alt : "Product photo",
      caption: typeof media.caption === "string" ? media.caption : undefined,
      focal: typeof media.focal === "string" ? media.focal : "50% 50%",
      actualItem: media.actualItem === true,
    };
  }).filter((item) => item.src);
}

function validVariants(raw: unknown, fallback: BrowseProduct): ProductVariant[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{
      id: `${fallback.id}-default`,
      label: "Standard",
      priceMode: fallback.priceMode,
      priceMinor: fallback.priceMinor,
      minPriceMinor: fallback.minPriceMinor,
      maxPriceMinor: fallback.maxPriceMinor,
      slug: fallback.slug,
      title: fallback.title,
    }];
  }
  return raw.map((item, index) => {
    const variant = item as Record<string, unknown>;
    return {
      id: typeof variant.id === "string" ? variant.id : `option-${index + 1}`,
      label: typeof variant.label === "string" ? variant.label : `Option ${index + 1}`,
      lengthInches: Number.isFinite(variant.lengthInches) ? Number(variant.lengthInches) : undefined,
      colour: typeof variant.colour === "string" ? variant.colour : undefined,
      sku: typeof variant.sku === "string" ? variant.sku : undefined,
      priceMode: ["fixed", "from", "range", "hidden", "quote"].includes(String(variant.priceMode)) ? variant.priceMode as ProductVariant["priceMode"] : fallback.priceMode,
      priceMinor: Number.isInteger(variant.priceMinor) ? Number(variant.priceMinor) : undefined,
      minPriceMinor: Number.isInteger(variant.minPriceMinor) ? Number(variant.minPriceMinor) : undefined,
      maxPriceMinor: Number.isInteger(variant.maxPriceMinor) ? Number(variant.maxPriceMinor) : undefined,
      slug: typeof variant.slug === "string" ? variant.slug : fallback.slug,
      title: typeof variant.title === "string" ? variant.title : `${fallback.title} — ${String(variant.label || `Option ${index + 1}`)}`,
    };
  });
}

function browseFromDoc(id: string, raw: Record<string, any>): BrowseProduct | null {
  if (raw.status !== "published" || typeof raw.slug !== "string" || typeof raw.title !== "string") return null;
  const category = typeof raw.category === "string" ? raw.category : null;
  const priceMode = ["fixed", "from", "range", "hidden", "quote"].includes(raw.priceMode) ? raw.priceMode : "quote";
  const availability = ["available", "made-to-order", "confirm", "unavailable"].includes(raw.availability) ? raw.availability : "confirm";
  const product: BrowseProduct = {
    id,
    slug: raw.slug,
    title: raw.title,
    category,
    productType: typeof raw.productType === "string" ? raw.productType : undefined,
    hairMaterial: typeof raw.hairMaterial === "string" ? raw.hairMaterial : undefined,
    hairTexture: typeof raw.hairTexture === "string" ? raw.hairTexture : undefined,
    hairColour: typeof raw.hairColour === "string" ? raw.hairColour : undefined,
    hairDensity: typeof raw.hairDensity === "string" ? raw.hairDensity : undefined,
    laceType: typeof raw.laceType === "string" ? raw.laceType : undefined,
    sku: typeof raw.sku === "string" ? raw.sku : undefined,
    careInstructions: typeof raw.careInstructions === "string" ? raw.careInstructions : undefined,
    priceMode,
    priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : undefined,
    minPriceMinor: Number.isInteger(raw.minPriceMinor) ? raw.minPriceMinor : undefined,
    maxPriceMinor: Number.isInteger(raw.maxPriceMinor) ? raw.maxPriceMinor : undefined,
    currency: "NGN",
    availability,
    media: validMedia(raw.media),
    status: "published",
    ownerConfirmed: raw.ownerConfirmed === true,
    designPreview: false,
    featuredOrder: Number.isFinite(raw.featuredOrder) ? Number(raw.featuredOrder) : 100,
  };
  return { ...product, variants: validVariants(raw.variants, product) };
}

async function suppressedProductIds(){const db=getAdminDb();const ids=await getStarterSuppressions("products");if(!db)return ids;const snap=await db.collection("products").get();for(const d of snap.docs){ids.add(d.id);const r=d.data();if(r.sourceStarterId)ids.add(r.sourceStarterId);const starter=getBrowseProducts(true).find(p=>p.slug===r.slug);if(starter)ids.add(starter.id);}return ids;}
export async function getBrowseProductsServer(allowPreview: boolean) {
  const db = getAdminDb();
  if (!db) return getBrowseProducts(allowPreview);
  try {
    const snap = await db.collection("publicProducts").limit(250).get();
    const products = snap.docs.map((doc) => browseFromDoc(doc.id, doc.data())).filter((item): item is BrowseProduct => Boolean(item));
    const suppressed=await suppressedProductIds();
    const registry=await getCategoryRegistry("products");
    return (products.length ? products : getBrowseProducts(allowPreview).filter(p=>!suppressed.has(p.id))).map(p=>({...p,categoryLabel:registry.entries.find(e=>e.id===p.category)?.label||p.category||""}));
  } catch {
    return [];
  }
}

export async function getProductDetailBySlugServer(slug: string, allowPreview: boolean): Promise<{ product: ProductDetailModel; initialVariantId: string } | undefined> {
  const db = getAdminDb();
  if (db) {
    try {
      const suppressed=await suppressedProductIds();
      const preview=getBrowseProducts(true).find(p=>p.slug===slug);

      const snap = await db.collection("publicProducts").limit(250).get();
      const hasPublishedProducts = !snap.empty;
      for (const doc of snap.docs) {
        const raw = doc.data();
        const browse = browseFromDoc(doc.id, raw);
        if (!browse) continue;
        const variants = validVariants(raw.variants, browse);
        const initial = variants.find((variant) => variant.slug === slug);
        if (browse.slug === slug || initial) {
          const description = typeof raw.description === "string" ? raw.description : "Ask KEO to confirm current availability and product details.";
          const product: ProductDetailModel = {
            id: browse.id,
            familyTitle: browse.title,
            titleLines: [browse.title],
            description,
            productType: browse.productType,
            hairMaterial: browse.hairMaterial,
            hairTexture: browse.hairTexture,
            hairColour: browse.hairColour,
            hairDensity: browse.hairDensity,
            laceType: browse.laceType,
            sku: browse.sku,
            careInstructions: browse.careInstructions,
            currency: "NGN",
            availability: browse.availability,
            media: browse.media,
            variants,
            status: "published",
            ownerConfirmed: true,
            designPreview: false,
          };
          return { product, initialVariantId: initial?.id || variants[0].id };
        }
      }
      if (hasPublishedProducts || (preview&&suppressed.has(preview.id))) return undefined;
    } catch {
      return undefined;
      // fall through to design preview
    }
  }
  return getProductDetailBySlug(slug, allowPreview);
}

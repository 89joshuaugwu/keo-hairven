import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { adminTimeMillis } from "@/lib/admin-serialise";
import { productDesignPreview, type ProductAvailability, type ProductCategory, type ProductPriceMode } from "@/lib/products";

export type { AdminProductStatus, AdminProductVariant, AdminProductRecord, AdminProductListItem, AdminMediaRecord } from "@/lib/admin-product-shared";
import type { AdminProductStatus, AdminProductVariant, AdminProductRecord, AdminProductListItem, AdminMediaRecord } from "@/lib/admin-product-shared";

export const starterProductIds = new Set(productDesignPreview.map((item) => item.id));

export function slugifyProduct(value: string) {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "product";
}

export function starterProductById(id: string): AdminProductRecord | null {
  const item = productDesignPreview.find((product) => product.id === id);
  if (!item) return null;
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    category: "",
    description: "",
    priceMode: item.priceMode,
    priceMinor: item.priceMinor,
    minPriceMinor: item.minPriceMinor,
    maxPriceMinor: item.maxPriceMinor,
    currency: "NGN",
    availability: item.availability,
    mediaIds: [],
    variants: [],
    status: "draft",
    ownerConfirmed: false,
    revision: 0,
    rawSourceText: item.title,
    preview: true,
  };
}

function fromDoc(id: string, raw: Record<string, any>): AdminProductRecord {
  return {
    id,
    slug: typeof raw.slug === "string" ? raw.slug : "",
    title: typeof raw.title === "string" ? raw.title : "Untitled product",
    category: typeof raw.category === "string" ? raw.category : "",
    description: typeof raw.description === "string" ? raw.description : "",
    productType: typeof raw.productType === "string" ? raw.productType : "",
    hairMaterial: typeof raw.hairMaterial === "string" ? raw.hairMaterial : "",
    hairTexture: typeof raw.hairTexture === "string" ? raw.hairTexture : "",
    hairColour: typeof raw.hairColour === "string" ? raw.hairColour : "",
    hairDensity: typeof raw.hairDensity === "string" ? raw.hairDensity : "",
    laceType: typeof raw.laceType === "string" ? raw.laceType : "",
    sku: typeof raw.sku === "string" ? raw.sku : "",
    careInstructions: typeof raw.careInstructions === "string" ? raw.careInstructions : "",

    priceMode: ["fixed", "from", "range", "hidden", "quote"].includes(raw.priceMode) ? raw.priceMode : "quote",
    priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : undefined,
    minPriceMinor: Number.isInteger(raw.minPriceMinor) ? raw.minPriceMinor : undefined,
    maxPriceMinor: Number.isInteger(raw.maxPriceMinor) ? raw.maxPriceMinor : undefined,
    currency: "NGN",
    availability: ["available", "made-to-order", "confirm", "unavailable"].includes(raw.availability) ? raw.availability : "confirm",
    mediaIds: Array.isArray(raw.mediaIds) ? raw.mediaIds.filter((x: unknown): x is string => typeof x === "string") : [],
    variants: Array.isArray(raw.variants)
      ? raw.variants.map((variant: Record<string, unknown>, index: number) => ({
          id: typeof variant.id === "string" ? variant.id : `variant-${index + 1}`,
          label: typeof variant.label === "string" ? variant.label : `Option ${index + 1}`,
          lengthInches: Number.isFinite(variant.lengthInches) ? Number(variant.lengthInches) : undefined,
          colour: typeof variant.colour === "string" ? variant.colour : undefined,
          sku: typeof variant.sku === "string" ? variant.sku : undefined,
          priceMode: ["fixed", "from", "range", "hidden", "quote"].includes(String(variant.priceMode)) ? variant.priceMode as ProductPriceMode : "quote",
          priceMinor: Number.isInteger(variant.priceMinor) ? Number(variant.priceMinor) : undefined,
          minPriceMinor: Number.isInteger(variant.minPriceMinor) ? Number(variant.minPriceMinor) : undefined,
          maxPriceMinor: Number.isInteger(variant.maxPriceMinor) ? Number(variant.maxPriceMinor) : undefined,
        }))
      : [],
    status: ["draft", "published", "archived", "trashed"].includes(raw.status) ? raw.status : "draft",
    ownerConfirmed: raw.ownerConfirmed === true,
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
    rawSourceText: typeof raw.rawSourceText === "string" ? raw.rawSourceText : undefined,
    createdAt: adminTimeMillis(raw.createdAt),
    updatedAt: adminTimeMillis(raw.updatedAt),
    deletedAt: adminTimeMillis(raw.deletedAt),
    purgeAt: adminTimeMillis(raw.purgeAt),
    purgeState: typeof raw.purgeState === "string" ? raw.purgeState : undefined,
  };
}

export async function getAdminProduct(id: string): Promise<AdminProductRecord | null> {
  const db = getAdminDb();
  if (!db) return starterProductById(id);
  try {
    const snap = await db.collection("products").doc(id).get();
    if (snap.exists) return fromDoc(snap.id, snap.data() || {});
  } catch {
    return starterProductById(id);
  }
  return (await getStarterSuppressions("products")).has(id)?null:starterProductById(id);
}

export async function getAdminProducts(): Promise<AdminProductListItem[]> {
  const db = getAdminDb();
  if (!db) return previewList();
  let snap;
  try {
    snap = await db.collection("products").limit(250).get();
  } catch {
    return previewList();
  }
  if (snap.empty){const suppressed=await getStarterSuppressions("products");return previewList().filter(p=>!suppressed.has(p.id));}
  const records = snap.docs.map((doc) => fromDoc(doc.id, doc.data()));
  const mediaIds: string[] = [...new Set<string>(records.flatMap((item) => item.mediaIds.slice(0, 1)))];
  const media = new Map<string, AdminMediaRecord>();
  if (mediaIds.length) {
    const chunks: string[][] = [];
    for (let i = 0; i < mediaIds.length; i += 10) chunks.push(mediaIds.slice(i, i + 10));
    for (const ids of chunks) {
      const mediaSnap = await db.collection("media").where(FieldPath.documentId(), "in", ids).get().catch(() => null);
      mediaSnap?.docs.forEach((doc) => media.set(doc.id, mediaFromDoc(doc.id, doc.data())));
    }
  }
  return records
    .map((item) => {
      const image = item.mediaIds[0] ? media.get(item.mediaIds[0]) : undefined;
      return { ...item, thumbnail: image?.secureUrl, imageAlt: image?.alt };
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function previewList(): AdminProductListItem[] {
  return productDesignPreview.map((item) => ({
    ...(starterProductById(item.id) as AdminProductRecord),
    thumbnail: item.media[0]?.src,
    imageAlt: item.media[0]?.alt,
  }));
}

export function mediaFromDoc(id: string, raw: Record<string, any>): AdminMediaRecord {
  return {
    id,
    publicId: typeof raw.publicId === "string" ? raw.publicId : undefined,
    secureUrl: typeof raw.secureUrl === "string" ? raw.secureUrl : "",
    resourceType: raw.resourceType === "video" ? "video" : "image",
    format: typeof raw.format === "string" ? raw.format : undefined,
    bytes: Number.isFinite(raw.bytes) ? Number(raw.bytes) : undefined,
    width: Number.isFinite(raw.width) ? Number(raw.width) : undefined,
    height: Number.isFinite(raw.height) ? Number(raw.height) : undefined,
    alt: typeof raw.alt === "string" ? raw.alt : "",
    caption: typeof raw.caption === "string" ? raw.caption : undefined,
    focal: raw.focal && typeof raw.focal === "object" ? raw.focal : undefined,
    provenance: typeof raw.provenance === "string" ? raw.provenance : undefined,
    generated: raw.generated === true,
    consentConfirmed: raw.consentConfirmed === true,
    actualItem: raw.actualItem === true,
    uses: Array.isArray(raw.uses) ? raw.uses.filter((x: unknown): x is string => typeof x === "string") : [],
    duration: Number.isFinite(raw.duration) ? Number(raw.duration) : undefined,
    originalFilename: typeof raw.originalFilename === "string" ? raw.originalFilename : undefined,
    status: raw.status === "trashed" || raw.deletedAt ? "trashed" : "active",
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
  };
}

export async function getAdminMedia(ids: string[]): Promise<AdminMediaRecord[]> {
  const db = getAdminDb();
  if (!db || !ids.length) return [];
  const out: AdminMediaRecord[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const snap = await db.collection("media").where(FieldPath.documentId(), "in", chunk).get().catch(() => null);
    snap?.docs.forEach((doc) => out.push(mediaFromDoc(doc.id, doc.data())));
  }
  return ids.map((id) => out.find((item) => item.id === id)).filter((item): item is AdminMediaRecord => Boolean(item));
}

export async function listAdminMedia(limit = 60): Promise<AdminMediaRecord[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("media").where("resourceType", "==", "image").limit(limit).get().catch(() => null);
  return snap ? snap.docs.map((doc) => mediaFromDoc(doc.id, doc.data())).filter((item) => item.secureUrl && item.status !== "trashed") : [];
}

export function draftPayload(input: Partial<AdminProductRecord>) {
  const allowedCategories = new Set(["bone-straight", "braided-wigs", "hair-extensions", "bundles"]);
  const allowedPriceModes = new Set(["fixed", "from", "range", "hidden", "quote"]);
  const allowedAvailability = new Set(["available", "made-to-order", "confirm", "unavailable"]);
  const cleanPriceMode = allowedPriceModes.has(String(input.priceMode)) ? input.priceMode as ProductPriceMode : "quote";
  const cleanCategory = typeof input.category === "string" ? input.category as ProductCategory : "";
  const cleanAvailability = allowedAvailability.has(String(input.availability)) ? input.availability as ProductAvailability : "confirm";
  const cleanVariants: AdminProductVariant[] = Array.isArray(input.variants)
    ? input.variants.slice(0, 30).map((variant, index) => {
        const variantMode = allowedPriceModes.has(String(variant.priceMode)) ? variant.priceMode : "quote";
        const length = Number(variant.lengthInches);
        return {
          id: typeof variant.id === "string" && variant.id.trim() ? variant.id.trim().slice(0, 80) : `option-${index + 1}`,
          label: typeof variant.label === "string" ? variant.label.trim().slice(0, 80) : "",
          ...(Number.isFinite(length) && length > 0 && length <= 100 ? { lengthInches: length } : {}),
          priceMode: variantMode,
          colour: typeof variant.colour === "string" ? variant.colour.trim().slice(0,80) : "",
          sku: typeof variant.sku === "string" ? variant.sku.trim().slice(0,80) : "",
          ...(Number.isInteger(variant.priceMinor) && (variant.priceMinor as number) >= 0 ? { priceMinor: variant.priceMinor } : {}),
          ...(Number.isInteger(variant.minPriceMinor) && (variant.minPriceMinor as number) >= 0 ? { minPriceMinor: variant.minPriceMinor } : {}),
          ...(Number.isInteger(variant.maxPriceMinor) && (variant.maxPriceMinor as number) >= 0 ? { maxPriceMinor: variant.maxPriceMinor } : {}),
        };
      })
    : [];
  return {
    slug: slugifyProduct(input.slug || input.title || "product"),
    title: String(input.title || "").trim().slice(0, 140),
    rawSourceText: String(input.rawSourceText || "").slice(0, 1000),
    category: cleanCategory,
    description: String(input.description || "").trim().slice(0, 3000),
    productType: String(input.productType || "").trim().slice(0, 120),
    hairMaterial: String(input.hairMaterial || "").trim().slice(0, 120),
    hairTexture: String(input.hairTexture || "").trim().slice(0, 120),
    hairColour: String(input.hairColour || "").trim().slice(0, 120),
    hairDensity: String(input.hairDensity || "").trim().slice(0, 120),
    laceType: String(input.laceType || "").trim().slice(0, 120),
    sku: String(input.sku || "").trim().slice(0, 120),
    careInstructions: String(input.careInstructions || "").trim().slice(0, 600),

    variants: cleanVariants,
    priceMode: cleanPriceMode,
    ...(Number.isInteger(input.priceMinor) && (input.priceMinor as number) >= 0 ? { priceMinor: input.priceMinor } : {}),
    ...(Number.isInteger(input.minPriceMinor) && (input.minPriceMinor as number) >= 0 ? { minPriceMinor: input.minPriceMinor } : {}),
    ...(Number.isInteger(input.maxPriceMinor) && (input.maxPriceMinor as number) >= 0 ? { maxPriceMinor: input.maxPriceMinor } : {}),
    currency: "NGN" as const,
    availability: cleanAvailability,
    mediaIds: Array.isArray(input.mediaIds) ? input.mediaIds.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 12) : [],
    ownerConfirmed: input.ownerConfirmed === true,
  };
}

export async function logAdminAction(actor: string | undefined, action: string, entityId: string, success = true) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("adminAudit").add({ actor: actor || "admin", action, entityId, success, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
}

export function productPublishErrors(product: AdminProductRecord, media: AdminMediaRecord[]) {
  const errors: Record<string, string> = {};
  if (!product.title.trim()) errors.title = "Product name is required.";
  if (!product.category) errors.category = "Choose the exact product category.";
  if (!product.description.trim()) errors.description = "Describe exactly what the customer will receive.";
  if (!product.ownerConfirmed) errors.ownerConfirmed = "Confirm the exact product details before publishing.";
  const productImages = media.filter((item) => item.resourceType === "image" && item.secureUrl);
  if (!productImages.length) errors.mediaIds = "Add at least one product image before publishing.";
  if (productImages.some((item) => !item.alt.trim())) errors.mediaAlt = "Every published product image needs an image description.";
  if (product.priceMode === "fixed" && !Number.isInteger(product.priceMinor)) errors.priceMinor = "Enter the fixed price.";
  if (product.priceMode === "from" && !Number.isInteger(product.minPriceMinor)) errors.minPriceMinor = "Enter the starting price.";
  if (product.priceMode === "range" && (!Number.isInteger(product.minPriceMinor) || !Number.isInteger(product.maxPriceMinor))) errors.range = "Enter both ends of the price range.";
  if (product.priceMode === "range" && Number.isInteger(product.minPriceMinor) && Number.isInteger(product.maxPriceMinor) && (product.minPriceMinor as number) > (product.maxPriceMinor as number)) errors.range = "The minimum price cannot be above the maximum price.";
  product.variants.forEach((variant, index) => {
    if (!variant.label.trim()) errors[`variant-${index}`] = "Each option needs a label.";
    if (variant.priceMode === "fixed" && !Number.isInteger(variant.priceMinor)) errors[`variant-price-${index}`] = "Enter the option price.";
  });
  return errors;
}

export function publicProductProjection(product: AdminProductRecord, media: AdminMediaRecord[]) {
  const productImages = media.filter((item) => item.resourceType === "image" && item.secureUrl);
  const variants = product.variants.length
    ? product.variants.map((variant, index) => ({
        ...variant,
        id: variant.id || `option-${index + 1}`,
        title: `${product.title}${variant.label ? ` — ${variant.label}` : ""}`,
        slug: index === 0 ? product.slug : `${product.slug}-${slugifyProduct(variant.label || `option-${index + 1}`)}`,
      }))
    : [{
        id: `${product.id}-default`,
        label: "Standard",
        priceMode: product.priceMode,
        ...(Number.isInteger(product.priceMinor) ? { priceMinor: product.priceMinor } : {}),
        ...(Number.isInteger(product.minPriceMinor) ? { minPriceMinor: product.minPriceMinor } : {}),
        ...(Number.isInteger(product.maxPriceMinor) ? { maxPriceMinor: product.maxPriceMinor } : {}),
        title: product.title,
        slug: product.slug,
      }];
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    category: product.category,
    description: product.description,
    productType: product.productType || "",
    hairMaterial: product.hairMaterial || "",
    hairTexture: product.hairTexture || "",
    hairColour: product.hairColour || "",
    hairDensity: product.hairDensity || "",
    laceType: product.laceType || "",
    sku: product.sku || "",
    careInstructions: product.careInstructions || "",
    priceMode: product.priceMode,
    ...(Number.isInteger(product.priceMinor) ? { priceMinor: product.priceMinor } : {}),
    ...(Number.isInteger(product.minPriceMinor) ? { minPriceMinor: product.minPriceMinor } : {}),
    ...(Number.isInteger(product.maxPriceMinor) ? { maxPriceMinor: product.maxPriceMinor } : {}),
    currency: "NGN",
    availability: product.availability,
    ownerConfirmed: true,
    status: "published",
    featuredOrder: 100,
    media: productImages.map((item) => ({
      src: item.secureUrl,
      alt: item.alt,
      caption: item.caption || undefined,
      focal: item.focal ? `${Math.round(item.focal.x * 100)}% ${Math.round(item.focal.y * 100)}%` : "50% 50%",
      actualItem: true,
    })),
    variants,
  };
}

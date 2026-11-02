import { getSiteUrl } from "@/lib/site-url";
export type ProductCategory = string;
export type ProductAvailability = "available" | "made-to-order" | "confirm" | "unavailable";
export type ProductPriceMode = "fixed" | "from" | "range" | "hidden" | "quote";

export type ProductMedia = {
  src: string;
  alt: string;
  caption?: string;
  focal?: string;
  actualItem: boolean;
};

export type ProductVariant = {
  id: string;
  label: string;
  lengthInches?: number;
  colour?: string;
  sku?: string;
  priceMode: ProductPriceMode;
  priceMinor?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  slug?: string;
  title: string;
};

export type BrowseProduct = {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory | null;
  categoryLabel?: string;
  productType?: string;
  hairMaterial?: string;
  hairTexture?: string;
  hairColour?: string;
  hairDensity?: string;
  laceType?: string;
  sku?: string;
  careInstructions?: string;
  priceMode: ProductPriceMode;
  priceMinor?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  currency: "NGN";
  availability: ProductAvailability;
  media: ProductMedia[];
  status: "published" | "design-preview";
  ownerConfirmed: boolean;
  designPreview: boolean;
  featuredOrder: number;
};

export type ProductDetailModel = {
  id: string;
  familyTitle: string;
  titleLines: [string, string?];
  description: string;
  productType?: string;
  hairMaterial?: string;
  hairTexture?: string;
  hairColour?: string;
  hairDensity?: string;
  laceType?: string;
  sku?: string;
  careInstructions?: string;
  currency: "NGN";
  availability: ProductAvailability;
  media: ProductMedia[];
  variants: ProductVariant[];
  status: "published" | "design-preview";
  ownerConfirmed: boolean;
  designPreview: boolean;
};

const illustrativeMedia: ProductMedia = {
  src: "/assets/campaign/hair-collection.webp",
  alt: "Hair collection with a wig mannequin and black hair pieces",
  caption: "",
  focal: "50% 50%",
  actualItem: false,
};

/**
 * Owner-confirmed Firestore public projections will populate this array in the
 * Firebase/public-projection batch. It is intentionally empty now: draft seed
 * records must never be silently promoted into live catalogue data.
 */
export const publicProducts: BrowseProduct[] = [];

/**
 * Development-only visual fixtures transcribed from the supplied private draft
 * seed. They remain explicitly marked design-preview and ownerConfirmed=false.
 */
export const productDesignPreview: BrowseProduct[] = [];

const previewVariants: ProductVariant[] = productDesignPreview.map((product) => ({
  id: product.id,
  label: `${product.title.match(/^\d+/)?.[0] ?? ""} inches`.trim(),
  lengthInches: Number(product.title.match(/^\d+/)?.[0] ?? undefined),
  priceMode: product.priceMode,
  priceMinor: product.priceMinor,
  slug: product.slug,
  title: product.title,
}));

export const previewProductDetail: ProductDetailModel = {
  id: "draft-soft-swiss-family",
  familyTitle: "Soft Swiss lace and ponytail",
  titleLines: ["Soft Swiss lace", "and ponytail."],
  description: "Please confirm product specifications and availability before committing.",
  currency: "NGN",
  availability: "confirm",
  media: [illustrativeMedia],
  variants: previewVariants,
  status: "design-preview",
  ownerConfirmed: false,
  designPreview: true,
};

export function isProductDesignPreviewEnabled() {
  // Starter previews are a code fallback only. Once real publicProducts exist,
  // the Firestore projection takes precedence automatically. No ENV switch is required.
  return false;
}

export function getBrowseProducts(allowPreview: boolean) {
  if (publicProducts.length > 0) return publicProducts;
  return allowPreview ? productDesignPreview : [];
}

export function getProductDetailBySlug(slug: string, allowPreview: boolean) {
  // Future published product detail records will be resolved here first.
  if (allowPreview && previewVariants.some((variant) => variant.slug === slug)) {
    const initialVariant = previewVariants.find((variant) => variant.slug === slug) ?? previewVariants[0];
    return { product: previewProductDetail, initialVariantId: initialVariant.id };
  }
  return undefined;
}

export function formatNairaMinor(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function productPriceLabel(product: Pick<BrowseProduct, "priceMode" | "priceMinor" | "minPriceMinor" | "maxPriceMinor">) {
  if (product.priceMode === "hidden") return "Price on request";
  if (product.priceMode === "quote") return "Ask for price";
  if (product.priceMode === "from" && product.minPriceMinor != null) return `From ${formatNairaMinor(product.minPriceMinor)}`;
  if (product.priceMode === "range" && product.minPriceMinor != null && product.maxPriceMinor != null) {
    return `${formatNairaMinor(product.minPriceMinor)} – ${formatNairaMinor(product.maxPriceMinor)}`;
  }
  if (product.priceMinor != null) return formatNairaMinor(product.priceMinor);
  return "Price on request";
}

export function variantPriceLabel(variant: ProductVariant) {
  if (variant.priceMode === "hidden") return "Price on request";
  if (variant.priceMode === "quote") return "Ask for price";
  if (variant.priceMode === "from" && variant.minPriceMinor != null) return `From ${formatNairaMinor(variant.minPriceMinor)}`;
  if (variant.priceMode === "range" && variant.minPriceMinor != null && variant.maxPriceMinor != null) {
    return `${formatNairaMinor(variant.minPriceMinor)} – ${formatNairaMinor(variant.maxPriceMinor)}`;
  }
  if (variant.priceMinor != null) return formatNairaMinor(variant.priceMinor);
  return "Price on request";
}


export function productEnquiryMessage(variant: ProductVariant, product?: ProductDetailModel) {
  const lines = [
    `Hi KEO Hairven! I’m interested in ${variant.title}.`,
    `Option: ${variant.label}`,
  ];
  if (variant.lengthInches) lines.push(`Length: ${variant.lengthInches} inches`);
  if (variant.colour || product?.hairColour) lines.push(`Colour: ${variant.colour || product?.hairColour}`);
  if (product?.hairTexture) lines.push(`Texture: ${product.hairTexture}`);
  if (product?.hairDensity) lines.push(`Density: ${product.hairDensity}`);
  if (product?.laceType) lines.push(`Lace: ${product.laceType}`);
  if (variant.sku || product?.sku) lines.push(`Reference: ${variant.sku || product?.sku}`);
  const visiblePrice =
    (variant.priceMode === "fixed" && variant.priceMinor != null) ||
    (variant.priceMode === "from" && variant.minPriceMinor != null) ||
    (variant.priceMode === "range" && variant.minPriceMinor != null && variant.maxPriceMinor != null);
  if (!visiblePrice) {
    lines.push("Please share the current price.");
  } else {
    lines.push(`Listed price: ${variantPriceLabel(variant)} (please confirm).`);
  }
  lines.push("Please confirm the exact item and availability.");
  if (variant.slug) lines.push(productCanonicalUrl(variant.slug));
  return lines.join("\n");
}

export function productCanonicalUrl(slug: string) {
  const base = getSiteUrl();
  return `${base}/products/${slug}`;
}

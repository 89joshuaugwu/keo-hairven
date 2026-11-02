import type { ProductAvailability, ProductCategory, ProductPriceMode } from "@/lib/products";

export type AdminProductStatus = "draft" | "published" | "archived" | "trashed";

export type AdminProductVariant = {
  id: string;
  label: string;
  lengthInches?: number;
  colour?: string;
  sku?: string;
  priceMode: ProductPriceMode;
  priceMinor?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
};

export type AdminProductRecord = {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory | "";
  description: string;
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
  mediaIds: string[];
  variants: AdminProductVariant[];
  status: AdminProductStatus;
  ownerConfirmed: boolean;
  revision: number;
  rawSourceText?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  purgeAt?: number;
  purgeState?: string;
  preview?: boolean;
};

export type AdminProductListItem = AdminProductRecord & {
  thumbnail?: string;
  imageAlt?: string;
};

export type AdminMediaRecord = {
  id: string;
  publicId?: string;
  secureUrl: string;
  resourceType: "image" | "video";
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
  focal?: { x: number; y: number };
  provenance?: string;
  generated?: boolean;
  consentConfirmed?: boolean;
  actualItem?: boolean;
  uses?: string[];
  duration?: number;
  originalFilename?: string;
  status?: "active" | "trashed";
  revision?: number;
};

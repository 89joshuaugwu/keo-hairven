import type { ServicePriceMode } from "@/lib/services";

export type AdminServiceStatus = "draft" | "published" | "archived" | "trashed";

export type AdminServiceRecord = {
  id: string;
  sourceStarterId?: string;
  suppressStarterPublic?: boolean;
  slug: string;
  title: string;
  description: string;
  mediaIds: string[];
  priceMode: ServicePriceMode;
  priceMinor?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  preparation: string;
  status: AdminServiceStatus;
  revision: number;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  purgeAt?: number;
  purgeState?: string;
  preview?: boolean;
};

export type AdminServiceListItem = AdminServiceRecord & {
  thumbnail?: string;
  imageAlt?: string;
};

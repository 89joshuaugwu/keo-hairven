import type { LookCategory, LookProvenance } from "@/lib/gallery";

export type AdminLookStatus = "draft" | "published" | "archived" | "trashed";
export type AdminLookPriceMode = "quote" | "fixed" | "from" | "hidden";

export function lookProvenanceLabel(provenance: LookProvenance, _generated: boolean) {
  if (provenance === "real-work") return "Client work";
  return "Gallery look";
}

export function lookCategoryLabel(category: LookCategory) {
  if (category === "braids") return "Braids";
  if (category === "wigs") return "Wigs & styling";
  return "Nails";
}


export type AdminLookRecord = {
  id: string;
  sourceStarterId?: string;
  suppressStarterPublic?: boolean;
  reference: string;
  slug: string;
  title: string;
  category: LookCategory | "";
  caption: string;
  mediaIds: string[];
  provenance: LookProvenance;
  generated: boolean;
  clientPermission: boolean;
  priceMode: AdminLookPriceMode;
  priceMinor?: number;
  status: AdminLookStatus;
  revision: number;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  purgeAt?: number;
  purgeState?: string;
  preview?: boolean;
};

export type AdminLookListItem = AdminLookRecord & {
  thumbnail?: string;
  thumbnailKind?: "image" | "video";
  imageAlt?: string;
};

export type AdminMediaStatus = "active" | "trashed";
export type AdminMediaProvenance = "real-work" | "inspiration" | "campaign" | "actual-product" | "service-media" | "business-evidence";

export type AdminMediaReference = {
  type: "product" | "look" | "service" | "content" | "starter";
  id: string;
  title: string;
  status?: string;
  href?: string;
};

export type AdminLibraryMedia = {
  id: string;
  publicId?: string;
  secureUrl: string;
  resourceType: "image" | "video";
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  dominantColor?: string;
  alt: string;
  caption: string;
  focal: { x: number; y: number };
  provenance: AdminMediaProvenance;
  generated: boolean;
  consentConfirmed: boolean;
  actualItem: boolean;
  originalFilename?: string;
  status: AdminMediaStatus;
  revision: number;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  purgeAt?: number;
  purgeState?: string;
  references: AdminMediaReference[];
  starter?: boolean;
  label: string;
};

export type SiteSetupStatus = {
  state: "not-started" | "running" | "ready" | "partial" | "failed";
  completedAt?: number;
  completedBy?: string;
  products: number;
  looks: number;
  services: number;
  faqs: number;
  media: number;
  cloudinaryCopied: number;
  cloudinaryFallbacks: number;
  message?: string;
};

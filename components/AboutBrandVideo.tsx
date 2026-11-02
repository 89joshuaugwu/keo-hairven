import { ManagedEditorialMedia } from "@/components/ManagedEditorialMedia";
import { defaultPublicSiteContent, type SiteContentMedia } from "@/lib/site-content";

/** One media owner keeps pause, visibility and reduced-motion behavior consistent. */
export function AboutBrandVideo({ media = defaultPublicSiteContent.aboutMedia }: { media?: SiteContentMedia }) {
  return <ManagedEditorialMedia media={media} className="about-bag-figure about-bag-frame" priority />;
}

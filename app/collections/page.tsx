import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { CollectionCards } from "@/components/CollectionCards";
export const metadata: Metadata = { title: "Collections", description: "Explore KEO Hairven hair collections: bone straight, braided wigs, hair extensions and bundles.", alternates: { canonical: "/collections" } };
export default function CollectionsPage() {
  return <><SiteHeader /><main id="main-content"><section className="section collections-heading-section"><div className="eyebrow">THE KEO HAIR EDIT</div><h1>A look for<br /><em>every you.</em></h1><p>Sleek, textured, a little statement. Explore the collections and find your starting point.</p></section><section className="section collections-browse-section" aria-label="Hair collections"><CollectionCards full /><p className="editorial-disclosure">Editorial style inspiration. These images do not represent verified in-stock items.</p></section><WhatsAppCta /></main><SiteFooter /></>;
}

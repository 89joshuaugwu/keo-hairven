import type { Metadata } from "next";
import { Suspense } from "react";
import { GalleryExplorer, GallerySkeleton } from "@/components/GalleryExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { getPublicLooksServer } from "@/lib/public-looks-server";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "Browse KEO Hairven hair lookbook inspiration and clearly labelled real work, then ask about a look on WhatsApp.",
  alternates: { canonical: "/gallery" },
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const looks = await getPublicLooksServer();
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section gallery-heading-section">
          <div className="gallery-pagehead">
            <div className="eyebrow">THE LOOKBOOK</div>
            <h1>Find your next <em>obsession.</em></h1>
            <p>Browse hair inspiration. Lookbook photos are not confirmed available products.</p>
          </div>
        </section>
        <section className="section gallery-browse-section">
          <Suspense fallback={<GallerySkeleton />}><GalleryExplorer looks={looks} /></Suspense>
        </section>
        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

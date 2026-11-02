import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { generalEnquiryFor } from "@/lib/site";
import { getPublicBusinessServer } from "@/lib/public-business-server";

export default async function NotFound() {
  const business = await getPublicBusinessServer();
  const generalEnquiry = generalEnquiryFor(business.whatsappDigits, business.name);
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section not-found-section">
          <div className="not-found-copy">
            <div className="eyebrow">404 / A LITTLE DETOUR</div>
            <h1>This look has<br />left the <em>gallery.</em></h1>
            <p>The page may have moved or the item is no longer published.</p>
            <div className="actions not-found-actions">
              <Link href="/products" className="button button-primary">Explore the hair collection <span aria-hidden="true">→</span></Link>
              <a href={generalEnquiry} target="_blank" rel="noopener noreferrer" className="button button-outline">Chat on WhatsApp <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

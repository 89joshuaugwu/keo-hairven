import type { Metadata } from "next";
import Link from "next/link";
import { AboutBrandVideo } from "@/components/AboutBrandVideo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { generalEnquiryFor } from "@/lib/site";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { getPublicSiteContentServer } from "@/lib/public-content-server";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about KEO Hairven hair collections and how to enquire through WhatsApp.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [content, business] = await Promise.all([getPublicSiteContentServer(), getPublicBusinessServer()]);
  const generalEnquiry = generalEnquiryFor(business.whatsappDigits, business.name);
  const headingLead = content.aboutHeadingLead.split("\n").filter(Boolean);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section about-heading-section">
          <div className="about-pagehead">
            <div className="eyebrow">OUR STORY</div>
            <h1>{headingLead.map((line, index) => <span key={`${line}-${index}`}>{line}<br /></span>)}<em>{content.aboutHeadingEmphasis}</em></h1>
            <p>{content.aboutIntro}</p>
          </div>
        </section>

        <section className="section about-story-section">
          <div className="about-story-grid">
            <AboutBrandVideo media={content.aboutMedia} />

            <div className="about-story-copy">
              <div className="eyebrow">{business.publicLocation.toUpperCase()}</div>
              <h2>{content.aboutSectionLead}<br /><em>{content.aboutSectionEmphasis}</em></h2>
              <p>{content.aboutBody1}</p>
              {content.aboutBody2 ? <p>{content.aboutBody2}</p> : null}

              <div className="about-story-links">
                <Link href="/products" className="about-story-row">
                  <div><b>Explore the hair collection</b><p>Wigs, extensions, bundles and bone-straight hair.</p></div>
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link href="/contact" className="about-story-row">
                  <div><b>A direct conversation</b><p>Ask about hair, availability and delivery on WhatsApp.</p></div>
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>

              <a className="button button-primary about-hello" href={generalEnquiry} target="_blank" rel="noopener noreferrer">
                Say hello to KEO Hairven <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

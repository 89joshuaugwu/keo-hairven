import type { Metadata } from "next";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { getPublicFaqsServer } from "@/lib/public-faqs-server";

export const metadata: Metadata = {
  title: "FAQs & Waybill",
  description: "Answers about KEO Hairven products, pricing, specifications, delivery and WhatsApp ordering.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getPublicFaqsServer();
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section faq-heading-section">
          <div className="faq-pagehead">
            <div className="eyebrow">QUESTIONS &amp; WAYBILL</div>
            <h1>A little clarity.<br />A lot more <em>confidence.</em></h1>
            <p>Helpful answers before we chat.</p>
          </div>
        </section>

        <section className="section faq-main-section">
          <FaqAccordion faqs={faqs} />
        </section>

        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { ContactEnquiry } from "@/components/ContactEnquiry";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact KEO Hairven on WhatsApp about hair, wigs, extensions or delivery enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section contact-heading-section">
          <div className="contact-pagehead">
            <div className="eyebrow">SAY HELLO</div>
            <h1>Let’s talk about<br />your <em>next look.</em></h1>
            <p>A question, a style reference or something in the collection? We’re a message away.</p>
          </div>
        </section>

        <section className="section contact-main-section">
          <ContactEnquiry />
        </section>

        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

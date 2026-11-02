import { generalEnquiryFor } from "@/lib/site";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { getPublicSiteContentServer } from "@/lib/public-content-server";
export async function WhatsAppCta() {
  const [content, business] = await Promise.all([getPublicSiteContentServer(), getPublicBusinessServer()]);
  return <section className="whatsapp-cta" aria-labelledby="enquiry-cta-heading"><div className="cta-strands" aria-hidden="true" /><div className="cta-content" data-reveal><div><div className="eyebrow">{content.ctaEyebrow}</div><h2 id="enquiry-cta-heading">{content.ctaHeadingLead}<br /><em>{content.ctaHeadingEmphasis}</em></h2></div><div className="cta-action"><p>{content.ctaBody}</p><a href={generalEnquiryFor(business.whatsappDigits, business.name)} className="button button-light">{business.whatsappDigits ? content.ctaButtonLabel : "Let’s find your next look"}<span aria-hidden="true">↗</span></a><span className="cta-note">A conversation, then the perfect choice.</span></div></div></section>;
}

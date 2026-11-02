"use client";

import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { generalEnquiryFor } from "@/lib/site";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const business = usePublicBusiness();
  const generalEnquiry = generalEnquiryFor(business.whatsappDigits, business.name);
  return (
    <main className="product-error-state">
      <div className="eyebrow">CATALOGUE UNAVAILABLE</div>
      <h1>We couldn’t load the collection.</h1>
      <p>Try again, or continue on WhatsApp without waiting for the catalogue.</p>
      <div className="actions">
        <button className="button button-outline" type="button" onClick={reset}>Try again</button>
        <a className="button button-primary" href={generalEnquiry} target="_blank" rel="noreferrer">Continue on WhatsApp ↗</a>
      </div>
    </main>
  );
}

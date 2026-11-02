"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="admin-products-content"><div className="admin-products-empty"><div className="eyebrow">GALLERY UNAVAILABLE</div><h2>We couldn’t load your looks.</h2><p>Your drafts have not been changed.</p><button type="button" className="button button-primary" onClick={reset}>Try again</button></div></main>;
}

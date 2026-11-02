"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="admin-pending-content"><div className="eyebrow">PRODUCTS</div><h1>We couldn’t load this view.</h1><p>Your products have not been changed. Try loading the page again.</p><button type="button" className="button button-primary" onClick={reset}>Try again</button></main>;
}

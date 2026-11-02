"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="admin-pending-content"><div className="eyebrow">MEDIA LIBRARY</div><h1>We couldn’t load your media.</h1><p>Your files have not been changed. Try loading the Media Library again.</p><button type="button" className="button button-primary" onClick={reset}>Try again</button></main>;
}

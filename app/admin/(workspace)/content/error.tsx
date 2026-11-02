"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="admin-content-content"><div className="admin-content-head"><div><div className="eyebrow">WEBSITE CONTENT</div><h1>We couldn’t load this editor.</h1></div></div><div className="admin-overview-notice">Your saved website content has not been changed. Try loading the editor again.</div><button className="button button-primary" type="button" onClick={reset}>Try again</button></main>;
}

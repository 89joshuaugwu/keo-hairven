"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="admin-ai-content"><section className="admin-editor-panel admin-ai-error"><h1>Ask KEO settings could not load.</h1><p>Refresh the workspace or try again.</p><button type="button" className="button button-primary" onClick={reset}>Try again</button></section></main>;
}

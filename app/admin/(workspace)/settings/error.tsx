"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="admin-settings-content">
      <div className="admin-settings-error">
        <div className="eyebrow">BUSINESS DETAILS</div>
        <h1>We couldn’t load these details.</h1>
        <p>Your public website has not been changed.</p>
        <button type="button" className="button button-primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}

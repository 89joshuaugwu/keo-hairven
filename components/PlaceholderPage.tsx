import Link from "next/link";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { MotionProvider } from "./MotionProvider";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <MotionProvider>
      <SiteHeader />
      <main className="placeholder-page">
        <div className="eyebrow">NEXT IMPLEMENTATION BATCH</div>
        <h1>{title}</h1>
        <p>This route is wired so the Home page journey works during incremental development. Its final responsive design and behaviour will be built from the handoff in the next page batch.</p>
        <Link href="/" className="button button-primary">Back to Home →</Link>
      </main>
      <SiteFooter />
    </MotionProvider>
  );
}

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
export default function NotFound() {
  return <><SiteHeader /><main id="main-content"><section className="section keo-not-found"><span className="eyebrow">PAGE NOT FOUND · 404</span><span className="not-found-flourish" aria-hidden="true">k.</span><h1>A different<br /><em>direction.</em></h1><p>This page may have moved, or the item is no longer published. Let’s find your way back to something lovely.</p><div><Link href="/products" className="button button-primary">Explore the collection ↗</Link><Link href="/" className="text-link">Back to home</Link></div></section></main><SiteFooter /></>;
}

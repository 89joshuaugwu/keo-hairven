"use client";
import Image from "next/image";
import Link from "next/link";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
export function SiteFooter() {
  const business = usePublicBusiness();
  return <footer className="site-footer" data-site-footer>
    <div className="footer-brand"><Image src="/assets/brand/keo-hairven-wordmark.png" alt={business.name} width={1200} height={810} /><p>{business.tagline}</p></div>
    <div className="footer-column"><b>Find your look</b><Link href="/products">Shop all hair</Link><Link href="/collections">The collections</Link><Link href="/gallery">The lookbook</Link></div>
    <div className="footer-column"><b>A little more KEO</b><Link href="/about">Our story</Link><Link href="/contact">Get in touch</Link><Link href="/faq">FAQs &amp; delivery</Link></div>
    <div className="footer-column footer-contact"><b>Let’s talk hair</b>{business.whatsappE164 ? <a href={`tel:${business.whatsappE164}`}>{business.whatsappDisplay}</a> : <Link href="/contact">Start a conversation <span aria-hidden="true">↗</span></Link>}<p>{business.publicLocation}</p>{business.instagramUrl && <a href={business.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}{business.tiktokUrl && <a href={business.tiktokUrl} target="_blank" rel="noopener noreferrer">TikTok ↗</a>}</div>
    <div className="footer-signature" aria-hidden="true">Beautifully <em>you.</em></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {business.name}</span><span>Confidence in every strand.</span><Link href="/privacy">Privacy policy</Link></div>
  </footer>;
}

"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { useMotionPreference } from "@/components/MotionProvider";
import { generalEnquiryFor } from "@/lib/site";

const links = [["Shop", "/products"], ["Collections", "/collections"], ["Lookbook", "/gallery"], ["Our story", "/about"], ["Contact", "/contact"]] as const;

export function SiteHeader() {
  const business = usePublicBusiness();
  const pathname = usePathname();
  const { reduced } = useMotionPreference();
  const enquiry = generalEnquiryFor(business.whatsappDigits, business.name);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const close = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (reduced) { setOpen(false); setClosing(false); return; }
    setClosing(true);
    closeTimer.current = setTimeout(() => { setOpen(false); setClosing(false); closeTimer.current = null; }, 280);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const outside = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && !node.contains(panel));
    const oldInert = outside.map((node) => node.inert);
    outside.forEach((node) => { node.inert = true; });
    panel?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setClosing(true);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => { setOpen(false); setClosing(false); }, reduced ? 0 : 280);
      }
      if (event.key === "Tab") {
        const items = panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      outside.forEach((node, index) => { node.inert = oldInert[index]; });
      window.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus(); else menuButtonRef.current?.focus();
    };
  }, [open, reduced]);

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="brand-announcement">Confidence in every strand. <Link href="/collections">Discover the KEO edit <span aria-hidden="true">↗</span></Link></div>
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="desktop-nav" aria-label="Primary navigation">{links.slice(0, 3).map(([label, href]) => <Link href={href} key={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}</nav>
      <Link href="/" className="brand-link" aria-label={`${business.name} home`}><Image src="/assets/brand/keo-hairven-wordmark.png" alt={business.name} width={1200} height={810} priority /></Link>
      <div className="header-right"><nav className="desktop-nav" aria-label="About KEO">{links.slice(3).map(([label, href]) => <Link href={href} key={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}</nav><a className="header-enquiry" href={enquiry} aria-label={business.whatsappDigits ? "Enquire on WhatsApp" : "Contact KEO Hairven"}><span>Let’s talk hair</span><span aria-hidden="true">↗</span></a></div>
      <button ref={menuButtonRef} className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { if (closeTimer.current) clearTimeout(closeTimer.current); setClosing(false); setOpen(true); }}>Menu <span className="menu-glyph" aria-hidden="true"><i /><i /></span></button>
    </header>
    {open && createPortal(<div className={`menu-overlay ${closing ? "is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div id="mobile-menu" className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Navigation" ref={panelRef}>
        <div className="mobile-menu-top"><Image src="/assets/brand/keo-hairven-wordmark.png" alt={business.name} width={1200} height={810} /><button type="button" onClick={close}>Close <span aria-hidden="true">×</span></button></div>
        <div className="eyebrow">A LOOK FOR EVERY YOU</div>
        <nav aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} onClick={() => { setOpen(false); setClosing(false); }}>{label}<span aria-hidden="true">↗</span></Link>)}<Link href="/faq" onClick={() => setOpen(false)}>Helpful answers<span aria-hidden="true">↗</span></Link></nav>
        <a className="button button-primary" href={enquiry}>{business.whatsappDigits ? "Chat on WhatsApp" : "Contact KEO Hairven"}<span aria-hidden="true">↗</span></a><p>{business.publicLocation}</p>
      </div>
    </div>, document.body)}
  </>;
}

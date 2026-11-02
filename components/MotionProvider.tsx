"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type MotionContextValue = { reduced: boolean };
const MotionContext = createContext<MotionContextValue>({ reduced: true });

/** Progressive enhancement: content is visible until a functioning observer opts it in. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(true);
  const pathname = usePathname();
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "paused" : "on";
    return () => { delete document.documentElement.dataset.motion; };
  }, [reduced]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    document.body.dataset.publicSite = "true";
    if (reduced || !("IntersectionObserver" in window)) return () => { delete document.body.dataset.publicSite; };
    const nodes = document.querySelectorAll<HTMLElement>("main [data-reveal], main .section-heading, main .edit-card, main .gallery-card, main .about-story-grid, main .product-pagehead, main .gallery-pagehead, main .about-pagehead, main .contact-pagehead, main .faq-pagehead");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target as HTMLElement;
        node.dataset.revealed = "true";
        observer.unobserve(node);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    for (const node of nodes) {
      // Above-fold headings stay immediately available. Never hide a focused control.
      if (node.getBoundingClientRect().top < window.innerHeight - 24) continue;
      node.dataset.revealReady = "true";
      observer.observe(node);
    }
    return () => {
      observer.disconnect();
      for (const node of nodes) { delete node.dataset.revealReady; delete node.dataset.revealed; }
      delete document.body.dataset.publicSite;
    };
  }, [pathname, reduced]);

  const value = useMemo(() => ({ reduced }), [reduced]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
export function useMotionPreference() { return useContext(MotionContext); }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { whatsappUrl } from "@/lib/site";

function makeWhatsappUrl(title: string, reference: string, canonicalUrl: string, digits: string) {
  const message = `Hi KEO Hairven! I’d like to ask about this look: ${title} (${reference}).\nPlease share the price and availability.\n${canonicalUrl}`;
  return whatsappUrl(message, digits);
}

export function LookActions({
  title,
  reference,
  canonicalUrl,
}: {
  title: string;
  reference: string;
  canonicalUrl: string;
}) {
  const business = usePublicBusiness();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">("idle");
  const [primaryVisible, setPrimaryVisible] = useState(true);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const whatsappHref = useMemo(() => makeWhatsappUrl(title, reference, canonicalUrl, business.whatsappDigits), [business.whatsappDigits, canonicalUrl, reference, title]);

  useEffect(() => {
    const node = primaryRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setPrimaryVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const visible = !primaryVisible;
    document.documentElement.classList.toggle("look-bar-visible", visible);
    return () => document.documentElement.classList.remove("look-bar-visible");
  }, [primaryVisible]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("fallback");
      window.setTimeout(() => fallbackRef.current?.select(), 0);
    }
  };

  return (
    <>
      <div className="look-actions">
        <a ref={primaryRef} href={whatsappHref} target="_blank" rel="noopener noreferrer" className="button button-primary">
          Ask for this look <span aria-hidden="true">↗</span>
        </a>
        <button type="button" className="button button-outline" onClick={copyLink}>
          {copyState === "copied" ? "Link copied" : "Copy look link"}
        </button>
      </div>
      <div className="copy-status" aria-live="polite">
        {copyState === "copied" && <span>Link copied.</span>}
        {copyState === "fallback" && (
          <label>
            <span>Copy this link:</span>
            <input ref={fallbackRef} readOnly value={canonicalUrl} onFocus={(event) => event.currentTarget.select()} />
          </label>
        )}
      </div>
      {!primaryVisible && (
        <div className="look-sticky-enquiry" aria-label="Quick enquiry">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="button button-primary">Ask for this look ↗</a>
        </div>
      )}
    </>
  );
}

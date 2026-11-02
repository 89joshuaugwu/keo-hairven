"use client";

import { useEffect, useMemo, useState } from "react";
import { faqCategories, publicFaqs, type FaqItem } from "@/lib/faqs";

export function FaqAccordion({ faqs = publicFaqs }: { faqs?: FaqItem[] }) {
  const items = faqs.length ? faqs : publicFaqs;
  const firstId = items[0]?.id ?? "";
  const categoryForFaq = (id: string) => items.find((item) => item.id === id)?.category ?? items[0]?.category ?? faqCategories[0].id;
  const [openId, setOpenId] = useState(firstId);
  const [activeCategory, setActiveCategory] = useState(categoryForFaq(firstId));

  const validIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const categoryTargets = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) if (!map.has(item.category)) map.set(item.category, item.id);
    return map;
  }, [items]);

  useEffect(() => {
    if (!validIds.has(openId)) {
      setOpenId(firstId);
      setActiveCategory(categoryForFaq(firstId));
    }
  }, [firstId, openId, validIds]);

  useEffect(() => {
    const syncFromHash = () => {
      const id = window.location.hash.slice(1);
      if (validIds.has(id)) {
        setOpenId(id);
        setActiveCategory(categoryForFaq(id));
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [items, validIds]);

  useEffect(() => {
    const nodes = items
      .map((faq) => document.getElementById(faq.id))
      .filter((item): item is HTMLElement => Boolean(item));
    if (!nodes.length) return;

    let frame = 0;
    const updateFromScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const marker = Math.min(window.innerHeight * 0.36, 290);
        let best = nodes[0];
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const item of nodes) {
          const rect = item.getBoundingClientRect();
          const distance = rect.top <= marker && rect.bottom >= marker
            ? 0
            : Math.min(Math.abs(rect.top - marker), Math.abs(rect.bottom - marker));
          if (distance < bestDistance) {
            best = item;
            bestDistance = distance;
          }
        }
        if (best) setActiveCategory(categoryForFaq(best.id));
      });
    };

    updateFromScroll();
    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
    };
  }, [items]);

  const toggle = (id: string) => {
    const willOpen = openId !== id;
    setOpenId(willOpen ? id : "");
    setActiveCategory(categoryForFaq(id));
    if (window.history?.replaceState) {
      window.history.replaceState(null, "", willOpen ? `#${id}` : window.location.pathname);
    }
  };

  const jumpToCategory = (target: string) => {
    setOpenId(target);
    setActiveCategory(categoryForFaq(target));
    if (window.history?.replaceState) window.history.replaceState(null, "", `#${target}`);
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="faq-layout">
      <aside className="faq-category-nav" aria-label="FAQ categories">
        {faqCategories.map((category) => {
          const target = categoryTargets.get(category.id);
          if (!target) return null;
          const active = activeCategory === category.id;
          return (
            <a
              key={category.id}
              href={`#${target}`}
              className={active ? "is-primary" : ""}
              aria-current={active ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                jumpToCategory(target);
              }}
            >
              {category.label}
            </a>
          );
        })}
      </aside>

      <div className="faq-list">
        {items.map((faq) => {
          const open = openId === faq.id;
          const panelId = `${faq.id}-answer`;
          return (
            <article className={`faq-item${open ? " is-open" : ""}`} id={faq.id} key={faq.id}>
              <h2>
                <button
                  id={`${faq.id}-button`}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(faq.id)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-symbol" aria-hidden="true">{open ? "−" : "+"}</span>
                </button>
              </h2>
              <div id={panelId} className="faq-answer" role="region" aria-labelledby={`${faq.id}-button`} aria-hidden={!open}>
                <p>{faq.answer}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

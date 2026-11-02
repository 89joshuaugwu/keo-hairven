"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { faqCategories, publicFaqs, type FaqItem } from "@/lib/faqs";
import { MuseTrigger } from "@/components/MuseTrigger";
import { useMotionPreference } from "@/components/MotionProvider";

export function FaqAccordion({ faqs = publicFaqs }: { faqs?: FaqItem[] }) {
  const [openId, setOpenId] = useState(faqs[0]?.id || "");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { reduced } = useMotionPreference();
  const filtered = useMemo(() => faqs.filter(faq => `${faq.question} ${faq.answer}`.toLowerCase().includes(query.trim().toLowerCase())), [faqs, query]);
  const activeCategory = faqs.find(faq => faq.id === openId)?.category;
  useEffect(() => {
    const sync = () => { let id = ""; try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; } if (faqs.some(faq => faq.id === id)) { setOpenId(id); setQuery(""); } };
    sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync);
  }, [faqs]);
  function toggle(id: string) { const next = openId === id ? "" : id; setOpenId(next); window.history.replaceState(null, "", next ? `#${encodeURIComponent(next)}` : window.location.pathname); }
  return <>
    <div className="faq-search"><label className="sr-only" htmlFor="faq-search">Search questions and answers</label><span aria-hidden="true">⌕</span><input id="faq-search" ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try ‘delivery’, ‘length’ or ‘payment’" type="search" />{query && <button type="button" aria-label="Clear FAQ search" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>×</button>}<small role="status">{filtered.length} {filtered.length === 1 ? "answer" : "answers"}</small></div>
    <div className="faq-layout"><aside className="faq-category-nav" aria-label="FAQ categories">{faqCategories.map(category => {
      const first = faqs.find(faq => faq.category === category.id); if (!first) return null;
      return <a key={category.id} href={`#${first.id}`} className={activeCategory === category.id ? "is-primary" : ""} aria-current={activeCategory === category.id ? "true" : undefined} onClick={event => { event.preventDefault(); setQuery(""); setOpenId(first.id); window.history.replaceState(null, "", `#${first.id}`); requestAnimationFrame(() => document.getElementById(first.id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" })); }}>{category.label}<span aria-hidden="true">↗</span></a>;
    })}<div className="faq-muse-note"><span aria-hidden="true">✦</span><p>A question of your own?</p><MuseTrigger className="text-link">Ask KEO Muse ↗</MuseTrigger></div></aside>
    <div className="faq-list">{filtered.length ? filtered.map(faq => {
      const open = openId === faq.id; const panelId = `${faq.id}-answer`;
      return <article className={`faq-item${open ? " is-open" : ""}`} id={faq.id} key={faq.id}><h2><button id={`${faq.id}-button`} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => toggle(faq.id)}><span>{faq.question}</span><span className="faq-symbol" aria-hidden="true">+</span></button></h2><div id={panelId} className="faq-answer-shell" data-open={open} role="region" aria-labelledby={`${faq.id}-button`} inert={!open}><div className="faq-answer"><p>{faq.answer}</p></div></div></article>;
    }) : <div className="faq-no-results"><h2>No matching answer <em>yet.</em></h2><p>Try a shorter phrase, or bring your question to KEO Muse.</p><button className="button button-outline" type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>Show all answers</button></div>}</div></div>
  </>;
}

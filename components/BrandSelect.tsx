"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
export type BrandSelectOption<T extends string> = { value: T; label: string };
type Props<T extends string> = { value: T; options: readonly BrandSelectOption<T>[]; onChange: (value: T) => void; ariaLabel: string; className?: string; buttonClassName?: string };
export function BrandSelect<T extends string>({ value, options, onChange, ariaLabel, className = "", buttonClassName = "" }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const [up, setUp] = useState(false);
  const [maxHeight, setMaxHeight] = useState(260);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const typeahead = useRef({ value: "", time: 0 });
  const listboxId = useId();
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selected = options[selectedIndex];
  function close(restore = false) { setOpen(false); if (restore) triggerRef.current?.focus(); }
  function show(index = selectedIndex) {
    if (!options.length) return;
    const bounds = rootRef.current?.getBoundingClientRect();
    if (bounds) { const below = window.innerHeight - bounds.bottom - 16; const above = bounds.top - 16; const upward = below < 220 && above > below; setUp(upward); setMaxHeight(Math.max(100, Math.min(260, upward ? above : below))); }
    setFocused(index); setOpen(true);
  }
  useEffect(() => {
    if (!open) return;
    optionRefs.current[focused]?.focus({ preventScroll: true });
    optionRefs.current[focused]?.scrollIntoView({ block: "nearest" });
  }, [open, focused]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function keys(event: KeyboardEvent) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key === "Tab") { close(); return; }
    const moves: Record<string, number> = { ArrowDown: open ? (focused + 1) % options.length : selectedIndex, ArrowUp: open ? (focused - 1 + options.length) % options.length : selectedIndex, Home: 0, End: options.length - 1 };
    if (event.key in moves && options.length) { event.preventDefault(); if (open) setFocused(moves[event.key]); else show(moves[event.key]); return; }
    if (open && event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey) {
      const now = Date.now(); typeahead.current = { value: (now - typeahead.current.time < 700 ? typeahead.current.value : "") + event.key.toLowerCase(), time: now };
      const index = options.findIndex(option => option.label.toLowerCase().startsWith(typeahead.current.value));
      if (index >= 0) { event.preventDefault(); setFocused(index); }
    }
  }
  return <div ref={rootRef} className={`brand-select ${open ? "is-open" : ""} ${className}`.trim()} onKeyDown={keys} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={triggerRef} type="button" className={`brand-select-button ${buttonClassName}`.trim()} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} disabled={!options.length} onClick={() => open ? close() : show()}><span>{selected?.label || "No options"}</span><span className="brand-select-chevron" aria-hidden="true">⌄</span></button>
    {open && <div className="brand-select-popover" data-side={up ? "top" : "bottom"} style={{ maxHeight }} id={listboxId} role="listbox" aria-label={ariaLabel}>{options.map((option, index) => <button ref={node => { optionRefs.current[index] = node; }} type="button" role="option" tabIndex={focused === index ? 0 : -1} aria-selected={option.value === value} className={option.value === value ? "is-selected" : ""} key={option.value} onClick={() => { onChange(option.value); close(true); }}><span>{option.label}</span>{option.value === value && <span aria-hidden="true">✓</span>}</button>)}</div>}
  </div>;
}

"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

let activeLocks = 0;
let unlockedOverflow = "";
function lockScroll() {
  if (activeLocks++ === 0) { unlockedOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
  return () => { if (--activeLocks === 0) document.body.style.overflow = unlockedOverflow; };
}

/** Native top-layer modal: browser-owned trapping/inertness with an authored exit. */
export function ModalDialog({ open, onClose, label, className = "", children }: { open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  // Separate unmount cleanup from open/close updates, including conditional callers.
  useEffect(() => () => {
    const dialog = ref.current;
    dialog?.close();
    const opener = restore.current;
    queueMicrotask(() => { if (opener?.isConnected) opener.focus(); });
  }, []);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    const dialog = ref.current;
    if (!dialog) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      if (!dialog.contains(document.activeElement)) restore.current = document.activeElement as HTMLElement;
      dialog.dataset.closing = "false";
      if (!dialog.open) dialog.showModal();
      (dialog.querySelector<HTMLElement>("[data-autofocus]") || dialog).focus();
      return lockScroll();
    }
    if (dialog.open) {
      dialog.dataset.closing = "true";
      timer = setTimeout(() => { dialog.close(); if (restore.current?.isConnected) restore.current.focus(); }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
    }
    return () => clearTimeout(timer);
  }, [open, mounted]);
  if (!mounted) return null;
  return createPortal(<dialog ref={ref} tabIndex={-1} className={`keo-dialog ${className}`} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose();
  }}>{children}</dialog>, document.body);
}

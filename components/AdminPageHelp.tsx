"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAdminPageGuide } from "@/lib/admin-page-help";

export function AdminPageHelp({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const guide = getAdminPageGuide(pathname);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);
  return <>
    <button ref={triggerRef} type="button" className="admin-help-trigger" aria-label={`Help: ${guide.title}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .4c0 1.6-2.5 1.8-2.5 3.6" /><path d="M12 16h.01" /></svg>
      <span>Help</span>
    </button>
    {open && createPortal(
      <dialog ref={dialogRef} className="admin-help-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => {
        if (event.target === dialogRef.current) {
          const bounds = dialogRef.current.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
        }
      }}>
        <header className="admin-help-header">
          <div><div className="eyebrow">PAGE GUIDE</div><h2 id={titleId}>{guide.title}</h2></div>
          <button type="button" className="admin-help-close" aria-label="Close page guide" autoFocus onClick={() => setOpen(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </header>
        <div className="admin-help-body">
          <p className="admin-help-intro">{guide.intro}</p>
          <ol className="admin-help-steps">{guide.steps.map((step, index) => <li key={step.title}><span aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
          <aside className="admin-help-reminder"><h3>Good to know</h3><p>{guide.reminder}</p></aside>
          <nav className="admin-help-links" aria-label="Related admin pages">{guide.links.map(link => <Link className="button button-outline button-small" key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<span aria-hidden="true">?</span></Link>)}</nav>
        </div>
      </dialog>, document.body,
    )}
  </>;
}

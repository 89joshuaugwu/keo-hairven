"use client";
import { useEffect, useRef, useState } from "react";
import { ModalDialog } from "@/components/ModalDialog";
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const leaving = useRef(false);
  const [destination, setDestination] = useState("");
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (leaving.current) return; event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault(); event.stopPropagation(); setDestination(url.href);
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  return <ModalDialog open={Boolean(destination)} onClose={() => setDestination("")} label="Unsaved changes" className="studio-unsaved-dialog"><div className="eyebrow">UNSAVED CHANGES</div><h2>Keep your work?</h2><p>Your changes haven’t been saved. Stay to save them, or leave and discard these edits.</p><div><button type="button" className="button button-primary" data-autofocus onClick={() => setDestination("")}>Keep editing</button><button type="button" className="button button-outline" onClick={() => { const href = destination; leaving.current = true; setDestination(""); window.location.assign(href); }}>Discard & leave</button></div></ModalDialog>;
}

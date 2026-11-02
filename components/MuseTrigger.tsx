"use client";
export function MuseTrigger({ children, className = "", prompt = "" }: { children: React.ReactNode; className?: string; prompt?: string }) {
  return <a href="/contact" className={className} onClick={event => {
    if (!window.dispatchEvent(new CustomEvent("keo-muse-open", { cancelable: true, detail: prompt }))) event.preventDefault();
  }}>{children}</a>;
}

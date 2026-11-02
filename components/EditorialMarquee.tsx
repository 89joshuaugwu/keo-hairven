"use client";

import { useState } from "react";
import { useMotionPreference } from "@/components/MotionProvider";

const phrases = ["Your hair. Your mood.", "Confidence in every strand.", "Beautifully, unapologetically you."];
export function EditorialMarquee() {
  const [paused, setPaused] = useState(false);
  const { reduced } = useMotionPreference();
  return <div className="editorial-marquee" data-paused={paused || reduced}>
    <p className="sr-only">{phrases.join(" ")}</p>
    <div className="editorial-marquee-track" aria-hidden="true">
      {[0, 1].map((copy) => <div className="editorial-marquee-group" key={copy}>{phrases.map((phrase) => <span key={phrase}>{phrase}<i>✦</i></span>)}</div>)}
    </div>
    {!reduced && <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Play moving text" : "Pause moving text"} aria-pressed={paused}>{paused ? "▶" : "Ⅱ"}</button>}
  </div>;
}

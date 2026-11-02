"use client";

import { useEffect, useState } from "react";
import { useMotionPreference } from "./MotionProvider";

const fallbackPhrases = ["All you.", "Your mood.", "Your moment."];

export function RotatingPhrase({ phrases = fallbackPhrases }: { phrases?: string[] }) {
  const { reduced } = useMotionPreference();
  const safePhrases = phrases.length ? phrases : fallbackPhrases;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced) {
      setIndex(0);
      setVisible(true);
      return;
    }
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setVisible(false);
      swapTimer = setTimeout(() => {
        setIndex((current) => (current + 1) % safePhrases.length);
        setVisible(true);
      }, 225);
    }, 5000);
    return () => {
      clearInterval(interval);
      if (swapTimer) clearTimeout(swapTimer);
    };
  }, [reduced, safePhrases.length]);

  return (
    <>
      <span className="sr-only">{safePhrases[0]}</span>
      <em aria-hidden="true" className={`rotating-phrase ${visible ? "is-visible" : "is-hidden"}`}>
        {safePhrases[index % safePhrases.length]}
      </em>
    </>
  );
}

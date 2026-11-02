"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "./MotionProvider";

export function CtaVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPreference();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: [0, 0.15, 0.5] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced) return;
    const syncPlayback = () => {
      if (visible && document.visibilityState === "visible") {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    };
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [visible, reduced]);

  return (
    <div ref={wrapRef} className="cta-video-wrap" aria-hidden="true">
      {!reduced && (
        <video
          ref={videoRef}
          className="cta-video"
          src="/assets/videos/05-blush-satin.mp4"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          tabIndex={-1}
        />
      )}
    </div>
  );
}

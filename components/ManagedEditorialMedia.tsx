"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SiteContentMedia } from "@/lib/site-content";
import { publicMediaLabel } from "@/lib/public-media-label";
import { useMotionPreference } from "./MotionProvider";

export function ManagedEditorialMedia({ media, className = "", priority = false }: { media: SiteContentMedia; className?: string; priority?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLElement>(null);
  const { reduced } = useMotionPreference();
  const [visible, setVisible] = useState(priority);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || media.kind !== "video") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15), { threshold: [0, 0.15, 0.5] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [media.kind]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.kind !== "video") return;
    const sync = () => {
      if (!paused && !reduced && visible && document.visibilityState === "visible") void video.play().catch(() => undefined);
      else video.pause();
    };
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => document.removeEventListener("visibilitychange", sync);
  }, [media.kind, reduced, visible, paused]);

  const poster = media.poster || (media.kind === "image" ? media.src : "/assets/campaign/waves-campaign.webp");

  return (
    <figure ref={wrapRef} className={`media-frame ${className}`}>
      <Image
        src={poster}
        alt={media.alt}
        fill
        sizes="(max-width: 639px) 100vw, 50vw"
        priority={priority}
        className="media-poster"
        style={{ objectPosition: media.focal || "50% 50%" }}
      />
      {media.kind === "video" && !reduced ? (
        <video
          ref={videoRef}
          className="media-video"
          src={media.src}
          poster={poster}
          muted
          loop
          playsInline
          preload={priority ? "auto" : "metadata"}
          aria-hidden="true"
          tabIndex={-1}
          style={{ objectPosition: media.focal || "50% 50%" }}
        />
      ) : media.kind === "image" && media.src !== poster ? (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          sizes="(max-width: 639px) 100vw, 50vw"
          priority={priority}
          className="media-video"
          style={{ objectFit: "cover", objectPosition: media.focal || "50% 50%" }}
        />
      ) : null}
      {media.kind === "video" && !reduced && <button type="button" className="media-playback" aria-label={paused ? "Play campaign video" : "Pause campaign video"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶" : "Ⅱ"}</button>}
      {media.caption ? <figcaption>{publicMediaLabel(media.caption)}</figcaption> : null}
    </figure>
  );
}

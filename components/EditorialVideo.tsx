"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "./MotionProvider";
import { publicMediaLabel } from "@/lib/public-media-label";

type EditorialVideoProps = {
  src: string;
  poster: string;
  alt: string;
  caption?: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
};

export function EditorialVideo({
  src,
  poster,
  alt,
  caption,
  className = "",
  priority = false,
  decorative = false,
}: EditorialVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLElement>(null);
  const { reduced } = useMotionPreference();
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: [0, 0.15, 0.5] }
    );
    observer.observe(el);
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
  }, [reduced, visible]);

  return (
    <figure ref={wrapRef} className={`media-frame ${className}`}>
      <Image
        src={poster}
        alt={alt}
        fill
        sizes="(max-width: 639px) 100vw, 50vw"
        priority={priority}
        className="media-poster"
      />
      {!reduced && (
        <video
          ref={videoRef}
          className="media-video"
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload={priority ? "auto" : "metadata"}
          aria-hidden={decorative ? true : undefined}
          tabIndex={-1}
        />
      )}
      {caption && <figcaption>{publicMediaLabel(caption)}</figcaption>}
    </figure>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { LookMedia } from "@/lib/gallery";
import { publicMediaLabel } from "@/lib/public-media-label";
import { useMotionPreference } from "./MotionProvider";

export function LookMediaGallery({ media, title }: { media: LookMedia[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  const { reduced } = useMotionPreference();
  const active = media[index];
  const motionDisabled = reduced;
  const hasMultiple = media.length > 1;

  const move = (direction: number) => {
    setFailed(false);
    setIndex((current) => (current + direction + media.length) % media.length);
  };

  useEffect(() => {
    const element = videoRef.current;
    if (active.kind !== "video" || motionDisabled || !element) return;
    const syncPlayback = () => {
      if (document.visibilityState === "visible") {
        void element.play().catch(() => undefined);
      } else {
        element.pause();
      }
    };
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [active.kind, index, motionDisabled]);

  useEffect(() => {
    if (!zoomOpen) return;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomOpen(false);
      if (event.key === "ArrowRight" && hasMultiple) move(1);
      if (event.key === "ArrowLeft" && hasMultiple) move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      zoomButtonRef.current?.focus();
    };
  }, [hasMultiple, zoomOpen]);

  const renderMedia = (zoom = false) => {
    if (failed) {
      return (
        <div className="media-fallback" role="img" aria-label={`${title} media unavailable`}>
          <span>Media unavailable</span>
          <small>{title}</small>
        </div>
      );
    }

    if (active.kind === "video" && !motionDisabled) {
      return (
        <video
          ref={zoom ? undefined : videoRef}
          src={active.src}
          poster={active.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-label={active.alt}
          style={{ objectPosition: active.focal || "50% 50%" }}
          onError={() => setFailed(true)}
        />
      );
    }

    const src = active.kind === "video"
      ? active.poster || media.find((item) => item.kind === "image")?.src || "/assets/campaign/braids-inspiration.webp"
      : active.src;
    return (
      <Image
        src={src}
        alt={active.alt}
        fill
        priority={!zoom && index === 0}
        sizes={zoom ? "100vw" : "(max-width: 639px) 100vw, 50vw"}
        style={{ objectPosition: active.focal || "50% 50%" }}
        onError={() => setFailed(true)}
      />
    );
  };

  return (
    <>
      <figure className="look-media" aria-label={`${title} media ${index + 1} of ${media.length}`}>
        <div
          className="look-media-stage"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" && hasMultiple) move(1);
            if (event.key === "ArrowLeft" && hasMultiple) move(-1);
          }}
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStart.current === null || !hasMultiple) return;
            const end = event.changedTouches[0]?.clientX ?? touchStart.current;
            const delta = end - touchStart.current;
            touchStart.current = null;
            if (Math.abs(delta) > 48) move(delta < 0 ? 1 : -1);
          }}
        >
          {renderMedia()}
          {!failed && active.kind !== "video" && (
            <button ref={zoomButtonRef} className="look-zoom-button" type="button" onClick={() => setZoomOpen(true)} aria-label={`Enlarge ${title} image`}>
              ⤢ <span>View</span>
            </button>
          )}
          {hasMultiple && (
            <div className="look-media-controls" aria-label="Media controls">
              <button type="button" onClick={() => move(-1)} aria-label="Previous media">←</button>
              <span>{index + 1} / {media.length}</span>
              <button type="button" onClick={() => move(1)} aria-label="Next media">→</button>
            </div>
          )}
        </div>
        <figcaption>{publicMediaLabel(active.caption)}</figcaption>
      </figure>

      {zoomOpen && (
        <div className="look-lightbox" role="dialog" aria-modal="true" aria-label={`${title} enlarged media`} onMouseDown={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }}>
          <button ref={closeButtonRef} className="look-lightbox-close" type="button" onClick={() => setZoomOpen(false)} aria-label="Close enlarged media">Close ×</button>
          <div className="look-lightbox-stage">{renderMedia(true)}</div>
          {hasMultiple && (
            <div className="look-lightbox-controls">
              <button type="button" onClick={() => move(-1)}>← Previous</button>
              <span>{index + 1} / {media.length}</span>
              <button type="button" onClick={() => move(1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

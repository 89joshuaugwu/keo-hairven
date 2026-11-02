"use client";
import { useCategoryOptions } from "@/components/CategoryProvider";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LookCategory, PublicLook } from "@/lib/gallery";
import { useMotionPreference } from "./MotionProvider";


function LookCardMedia({ look }: { look: PublicLook }) {
  const video = look.media.find((item) => item.kind === "video");
  const image = look.media.find((item) => item.kind === "image");
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPreference();
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const motionDisabled = reduced;

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.55),
      { threshold: [0, 0.55, 0.9] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [video]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !video || motionDisabled) return;
    const syncPlayback = () => {
      if (visible && document.visibilityState === "visible") {
        void element.play().catch(() => undefined);
      } else {
        element.pause();
      }
    };
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [motionDisabled, video, visible]);

  return (
    <div ref={wrapRef} className={`gallery-card-media ${failed ? "is-failed" : ""}`}>
      {!failed && image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 639px) 100vw, 33vw"
          style={{ objectPosition: image.focal || "50% 50%" }}
          onError={() => setFailed(true)}
        />
      ) : !failed && video ? (
        <div className="gallery-card-video-poster" aria-hidden="true" />
      ) : (
        <div className="media-fallback" role="img" aria-label={`${look.title} image unavailable`}>
          <span>Image unavailable</span>
          <small>{look.title}</small>
        </div>
      )}
      {video && !failed && !motionDisabled && (
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster || image?.src}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="gallery-card-video"
          style={{ objectPosition: video.focal || "50% 50%" }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function GallerySkeleton() {
  return (
    <div className="gallery-skeleton-grid" aria-label="Loading looks" aria-live="polite">
      {[0, 1, 2].map((item) => (
        <div className="gallery-skeleton" key={item}>
          <div className="gallery-skeleton-media" />
          <div className="gallery-skeleton-line wide" />
          <div className="gallery-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export function GalleryExplorer({ looks }: { looks: PublicLook[] }) {
  const categories = useCategoryOptions("gallery","All looks","all");
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const rawCategory = params.get("category") || "all";
  const category = categories.some((item) => item.value === rawCategory) ? rawCategory : "all";
  const query = params.get("q") || "";
  const [search, setSearch] = useState(query);

  useEffect(() => setSearch(query), [query]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return looks.filter((look) => {
      const categoryMatches = category === "all" || look.category === category;
      const searchMatches =
        !needle ||
        look.title.toLowerCase().includes(needle) ||
        look.tags.some((tag) => tag.toLowerCase().includes(needle));
      return categoryMatches && searchMatches;
    });
  }, [category, looks, query]);

  const buildUrl = (nextCategory: string, nextQuery: string) => {
    const next = new URLSearchParams();
    if (nextCategory !== "all") next.set("category", nextCategory);
    if (nextQuery.trim()) next.set("q", nextQuery.trim());
    const suffix = next.toString();
    return suffix ? `/gallery?${suffix}` : "/gallery";
  };

  const setCategory = (nextCategory: string) => {
    startTransition(() => router.push(buildUrl(nextCategory, search), { scroll: false }));
  };

  const onSearch = (value: string) => {
    setSearch(value);
    startTransition(() => router.replace(buildUrl(category, value), { scroll: false }));
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => router.push("/gallery", { scroll: false }));
  };

  return (
    <>
      <div className="gallery-filters" aria-label="Filter looks">
        <div className="gallery-filter-tabs" role="group" aria-label="Look category">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={category === item.value ? "is-selected" : ""}
              aria-pressed={category === item.value}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="gallery-search">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Search looks</span>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            type="search"
            placeholder="Search looks"
            autoComplete="off"
          />
        </label>
      </div>

      {isPending ? (
        <GallerySkeleton />
      ) : filtered.length > 0 ? (
        <div className="gallery-grid" aria-live="polite">
          {filtered.map((look) => (
            <Link
              href={`/gallery/${look.slug}`}
              className="gallery-card"
              key={look.id}
              aria-label={`View ${look.title}`}
            >
              <LookCardMedia look={look} />
              <div className="card-line">
                <h3>{look.title}</h3>
                <span aria-hidden="true">↗</span>
              </div>
              <p>{look.categoryLabel}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="gallery-empty" role="status">
          <div className="eyebrow">NO LOOKS MATCH</div>
          <h2>Nothing in this filter <em>yet.</em></h2>
          <p>Try another category or clear your search.</p>
          <button type="button" className="button button-outline" onClick={clearFilters}>Clear filters</button>
        </div>
      )}

      <button type="button" className="button button-outline gallery-view-all" onClick={clearFilters}>
        View all looks
      </button>
    </>
  );
}

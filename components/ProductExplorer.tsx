"use client";
import { MuseTrigger } from "@/components/MuseTrigger";
import { useCategoryOptions } from "@/components/CategoryProvider";

import Image from "next/image";
import { BrandSelect } from "@/components/BrandSelect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { BrowseProduct, ProductCategory } from "@/lib/products";
import { productPriceLabel } from "@/lib/products";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { whatsappUrl } from "@/lib/site";


const sorts = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "title", label: "Title: A–Z" },
] as const;

type SortValue = (typeof sorts)[number]["value"];

function availabilityLabel(value: BrowseProduct["availability"]) {
  if (value === "available") return "Available · please confirm before you commit";
  if (value === "made-to-order") return "Made to order · confirm timing";
  if (value === "unavailable") return "Unavailable · ask about alternatives";
  return "Confirm item & availability";
}

function ProductCard({ product }: { product: BrowseProduct }) {
  const [failed, setFailed] = useState(false);
  const image = product.media[0];

  return (
    <Link href={`/products/${product.slug}`} className="product-card" aria-label={`View ${product.title}`}>
      <div className="product-card-media">
        {!failed && image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 899px) 50vw, 33vw"
            style={{ objectFit: "cover", objectPosition: image.focal || "50% 50%" }}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="media-fallback" role="img" aria-label={`${product.title} image unavailable`}>
            <span>Image unavailable</span>
            <small>{product.title}</small>
          </div>
        )}
      </div>
      <div className="card-line product-card-line">
        <h3>{product.title}</h3>
        <span aria-hidden="true">↗</span>
      </div>
      <p>{availabilityLabel(product.availability)}</p>
      <strong className="product-price">{productPriceLabel(product)}</strong>
    </Link>
  );
}

export function ProductSkeleton() {
  return (
    <div className="product-grid product-skeleton-grid" aria-label="Loading products" aria-live="polite">
      {[0, 1, 2].map((item) => (
        <div className="product-skeleton" key={item}>
          <div className="product-skeleton-media" />
          <div className="product-skeleton-line wide" />
          <div className="product-skeleton-line" />
          <div className="product-skeleton-line price" />
        </div>
      ))}
    </div>
  );
}

export function ProductExplorer({ products, previewMode }: { products: BrowseProduct[]; previewMode: boolean }) {
  const categories = useCategoryOptions("products","All products","all");
  const business = usePublicBusiness();
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rawCategory = params.get("category") || "all";
  const category = categories.some((item) => item.value === rawCategory) ? rawCategory : "all";
  const rawSort = params.get("sort") || "featured";
  const sort = sorts.some((item) => item.value === rawSort) ? (rawSort as SortValue) : "featured";

  const filtered = useMemo(() => {
    const matches = products.filter((product) => category === "all" || product.category === category);
    return [...matches].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "price-low") return (a.priceMinor ?? a.minPriceMinor ?? Number.MAX_SAFE_INTEGER) - (b.priceMinor ?? b.minPriceMinor ?? Number.MAX_SAFE_INTEGER);
      if (sort === "price-high") return (b.priceMinor ?? b.maxPriceMinor ?? -1) - (a.priceMinor ?? a.maxPriceMinor ?? -1);
      return a.featuredOrder - b.featuredOrder;
    });
  }, [category, products, sort]);

  const buildUrl = (nextCategory: string, nextSort: string) => {
    const next = new URLSearchParams();
    if (nextCategory !== "all") next.set("category", nextCategory);
    if (nextSort !== "featured") next.set("sort", nextSort);
    const suffix = next.toString();
    return suffix ? `/products?${suffix}` : "/products";
  };

  const setCategory = (nextCategory: string) => {
    startTransition(() => router.push(buildUrl(nextCategory, sort), { scroll: false }));
  };

  const setSort = (nextSort: SortValue) => {
    startTransition(() => router.push(buildUrl(category, nextSort), { scroll: false }));
  };

  const clearFilters = () => {
    startTransition(() => router.push("/products", { scroll: false }));
  };

  return (
    <>
      <div className="product-controls" aria-label="Browse products">
        <div className="product-filter-tabs" role="group" aria-label="Product category">
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
        <div className="product-sort">
          <span>Sort:</span>
          <BrandSelect
            value={sort}
            options={sorts}
            onChange={(nextSort) => setSort(nextSort)}
            ariaLabel="Sort products"
            className="product-sort-select"
          />
        </div>
      </div>


      {isPending ? (
        <ProductSkeleton />
      ) : filtered.length > 0 ? (
        <div className="product-grid" aria-live="polite">
          {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="product-empty" role="status">
          <div className="eyebrow">CATALOGUE UPDATE</div>
          <h2>New pieces are being <em>prepared.</em></h2>
          <p>The next edit is on its way. Tell us the look you have in mind while we prepare the published collection.</p>
          <div className="empty-actions"><MuseTrigger className="button button-primary" prompt="Help me choose a look while the catalogue is being prepared.">Find my look with Muse ✦</MuseTrigger><Link className="text-link" href="/collections">Explore the moodboard ↗</Link></div>
        </div>
      ) : (
        <div className="product-empty" role="status">
          <div className="eyebrow">NO PRODUCTS MATCH</div>
          <h2>Nothing in this category <em>yet.</em></h2>
          <p>Try another category or return to all products.</p>
          <button type="button" className="button button-outline" onClick={clearFilters}>View all products</button>
        </div>
      )}
    </>
  );
}

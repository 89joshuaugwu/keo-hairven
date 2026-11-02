import "server-only";
import type { MetadataRoute } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPublicLooksServer } from "@/lib/public-looks-server";
import { getBrowseProductsServer } from "@/lib/public-products-server";
import { getSiteUrl } from "@/lib/site-url";


async function publishedProductSlugs() {
  const slugs = new Set<string>();
  const products = await getBrowseProductsServer(false);
  for (const product of products) {
    if (!product.designPreview && product.status === "published") slugs.add(product.slug);
  }

  const db = getAdminDb();
  if (!db) return [...slugs];
  try {
    const snap = await db.collection("publicProducts").limit(250).get();
    for (const doc of snap.docs) {
      const raw = doc.data() as Record<string, unknown>;
      if (raw.status !== "published") continue;
      if (typeof raw.slug === "string" && raw.slug) slugs.add(raw.slug);
      if (Array.isArray(raw.variants)) {
        for (const variant of raw.variants) {
          if (variant && typeof variant === "object" && typeof (variant as Record<string, unknown>).slug === "string") {
            slugs.add(String((variant as Record<string, unknown>).slug));
          }
        }
      }
    }
  } catch {
    // The public list slugs above are still safe to expose if Firestore is temporarily unavailable.
  }
  return [...slugs];
}

export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [looks, productSlugs] = await Promise.all([
    getPublicLooksServer(),
    publishedProductSlugs(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/gallery`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/collections`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/products`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  for (const look of looks.filter((item) => item.status === "published")) {
    entries.push({ url: `${base}/gallery/${look.slug}`, changeFrequency: "monthly", priority: 0.75 });
  }

  if (productSlugs.length) {
    entries.push({ url: `${base}/products`, changeFrequency: "weekly", priority: 0.9 });
    for (const slug of productSlugs) {
      entries.push({ url: `${base}/products/${slug}`, changeFrequency: "weekly", priority: 0.8 });
    }
  }

  return entries;
}

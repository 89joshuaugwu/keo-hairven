import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import {
  isProductDesignPreviewEnabled,
  productCanonicalUrl
} from "@/lib/products";
import { getProductDetailBySlugServer } from "@/lib/public-products-server";

export function generateStaticParams() {
  // Draft/design-preview products are intentionally excluded from production
  // static params. Published projection slugs will be added in the data batch.
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const previewMode = isProductDesignPreviewEnabled();
  const resolved = await getProductDetailBySlugServer(slug, previewMode);
  if (!resolved) return { title: "Product not found" };

  const initialVariant = resolved.product.variants.find((variant) => variant.id === resolved.initialVariantId) ?? resolved.product.variants[0];
  const image = resolved.product.media[0];
  return {
    title: initialVariant.title,
    description: resolved.product.description,
    alternates: { canonical: `/products/${initialVariant.slug ?? slug}` },
    robots: resolved.product.designPreview ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${initialVariant.title} — KEO Hairven`,
      description: resolved.product.description,
      images: image ? [{ url: image.src, alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const previewMode = isProductDesignPreviewEnabled();
  const resolved = await getProductDetailBySlugServer(slug, previewMode);
  if (!resolved) notFound();

  const initialVariant = resolved.product.variants.find((variant) => variant.id === resolved.initialVariantId) ?? resolved.product.variants[0];

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section product-detail-section">
          <nav className="product-breadcrumb" aria-label="Breadcrumb">
            <Link href="/products">Products</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{resolved.product.familyTitle}</span>
          </nav>

          <ProductDetailClient product={resolved.product} initialVariantId={initialVariant.id} />
          <span className="sr-only">Canonical product URL: {productCanonicalUrl(initialVariant.slug ?? slug)}</span>
        </section>
        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

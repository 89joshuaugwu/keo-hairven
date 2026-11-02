import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductExplorer, ProductSkeleton } from "@/components/ProductExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { isProductDesignPreviewEnabled } from "@/lib/products";
import { getBrowseProductsServer } from "@/lib/public-products-server";
import { whatsappUrl } from "@/lib/site";
import { getPublicBusinessServer } from "@/lib/public-business-server";

export async function generateMetadata(): Promise<Metadata> {
  const previewMode = isProductDesignPreviewEnabled();
  const products = await getBrowseProductsServer(previewMode);
  const previewOnly = products.length === 0 || products.every((product) => product.designPreview);
  return {
    title: "Products",
    description: "Browse KEO Hairven catalogue entries and confirm current product details and availability on WhatsApp.",
    alternates: { canonical: "/products" },
    robots: previewOnly ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage() {
  const previewMode = isProductDesignPreviewEnabled();
  const [products, business] = await Promise.all([getBrowseProductsServer(previewMode), getPublicBusinessServer()]);
  const deliveryUrl = whatsappUrl(
    `Hi KEO Hairven! I’d like to discuss waybill. ${business.deliveryNote}`,
    business.whatsappDigits
  );

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section product-heading-section">
          <div className="product-pagehead">
            <div className="eyebrow">THE COLLECTION</div>
            <h1>Find your <em>signature hair.</em></h1>
            <p>Explore wigs, extensions and bundles. Choose your options and enquire on WhatsApp.</p>
          </div>
        </section>

        <section className="section product-browse-section">
          <Suspense fallback={<ProductSkeleton />}>
            <ProductExplorer products={products} previewMode={previewMode} />
          </Suspense>
        </section>

        <section className="section product-waybill-section">
          <div className="eyebrow">NEED IT SENT TO YOU?</div>
          <h2>Ask us about <em>waybill.</em></h2>
          <p>{business.deliveryNote}</p>
          <a className="button button-outline" href={deliveryUrl} target="_blank" rel="noopener noreferrer">Discuss delivery <span aria-hidden="true">↗</span></a>
        </section>

        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LookActions } from "@/components/LookActions";
import { LookMediaGallery } from "@/components/LookMediaGallery";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { lookCanonicalUrl, type PublicLook } from "@/lib/gallery";
import { formatNairaMinor } from "@/lib/products";
import { getPublicLookBySlugServer } from "@/lib/public-looks-server";
import { whatsappUrl } from "@/lib/site";
import { getPublicBusinessServer } from "@/lib/public-business-server";

export const dynamic = "force-dynamic";
export function generateStaticParams() { return []; }

function priceLabel(look: PublicLook) {
  if (look.priceMode === "hidden") return "Ask for details";
  if (look.priceMode === "fixed" && Number.isInteger(look.priceMinor)) return formatNairaMinor(look.priceMinor as number);
  if (look.priceMode === "from" && Number.isInteger(look.priceMinor)) return `From ${formatNairaMinor(look.priceMinor as number)}`;
  return "Ask for a quote";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const look = await getPublicLookBySlugServer(slug);
  if (!look) return { title: "Look not found" };
  const image = look.media.find((item) => item.kind === "image")?.src;
  return {
    title: look.title,
    description: look.description,
    alternates: { canonical: `/gallery/${look.slug}` },
    openGraph: { title: `${look.title} — KEO Hairven`, description: look.description, images: image ? [{ url: image, alt: look.media[0]?.alt || look.title }] : undefined },
  };
}

export default async function LookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [look, business] = await Promise.all([getPublicLookBySlugServer(slug), getPublicBusinessServer()]);
  if (!look) notFound();
  const canonicalUrl = lookCanonicalUrl(look.slug);
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="section look-detail-section">
          <nav className="look-breadcrumb" aria-label="Breadcrumb"><Link href="/gallery">Gallery</Link><span aria-hidden="true"> / </span><Link href={`/gallery?category=${look.category}`}>{look.categoryLabel}</Link><span aria-hidden="true"> / </span><span aria-current="page">{look.title}</span></nav>
          <div className="look-detail-grid">
            <LookMediaGallery media={look.media} title={look.title} />
            <div className="look-detail-copy">
              <div className="eyebrow">{look.categoryLabel.toUpperCase()}</div>
              <h1>{look.titleLines[0]}{look.titleLines[1] && <><br /><em>{look.titleLines[1]}</em></>}</h1>
              <p>{look.description}</p>
              <span className="look-quote-tag">{priceLabel(look)}</span>
              <LookActions title={look.title} reference={look.reference} canonicalUrl={canonicalUrl} />
              <div className="look-guidance">{look.guidance.map((item) => <a href={whatsappUrl(`Hi KEO Hairven! I’d like to ask about ${look.title}. ${item.body}`, business.whatsappDigits)} target="_blank" rel="noopener noreferrer" className="look-guidance-row" key={item.title}><div><b>{item.title}</b><p>{item.body}</p></div><span aria-hidden="true">↗</span></a>)}</div>
            </div>
          </div>
        </section>
        <WhatsAppCta />
      </main>
      <SiteFooter />
    </>
  );
}

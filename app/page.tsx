import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { ManagedEditorialMedia } from "@/components/ManagedEditorialMedia";
import { CollectionCards } from "@/components/CollectionCards";
import { EditorialMarquee } from "@/components/EditorialMarquee";
import { getPublicSiteContentServer } from "@/lib/public-content-server";
import { getBrowseProductsServer } from "@/lib/public-products-server";
import { productPriceLabel } from "@/lib/products";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { generalEnquiryFor } from "@/lib/site";

export default async function HomePage() {
  const [products, business, content] = await Promise.all([getBrowseProductsServer(false), getPublicBusinessServer(), getPublicSiteContentServer()]);
  const headline = content.homeHeading.split("\n").filter(Boolean);
  return <><SiteHeader /><main id="main-content" className="keo-home">
    <section className="campaign-hero" aria-labelledby="hero-heading">
      <div className="campaign-copy">
        <div className="eyebrow campaign-eyebrow"><span className="fine-star" aria-hidden="true">✦</span> THE ART OF BEAUTIFUL HAIR</div>
        <h1 id="hero-heading">{headline.map((line, index) => <span className="headline-mask" key={index}><span className={index === headline.length - 1 ? "headline-italic" : ""}>{line}</span></span>)}</h1>
        <p className="campaign-description">{content.published ? content.homeSupportingText : "For every version of you. Discover wigs, extensions and bundles that make a look feel like your own."}</p>
        <div className="campaign-actions"><Link href="/products" className="button button-light">Find your signature <span aria-hidden="true">↗</span></Link><a className="campaign-chat" href={generalEnquiryFor(business.whatsappDigits, business.name)}>{business.whatsappDigits ? "Let’s talk hair" : "Get in touch"}<span aria-hidden="true">↗</span></a></div>
        <div className="campaign-footnote"><span>WIGS · EXTENSIONS · BUNDLES</span><a href={content.showBeautyEdit ? "#hair-edit" : "/collections"} aria-label="Explore the hair edit">Explore below <span aria-hidden="true">↓</span></a></div>
      </div>
      <div className="campaign-visual">
        <ManagedEditorialMedia media={content.homeHeroMedia} className="campaign-media" priority />
        <div className="campaign-image-label"><span>THE KEO EDIT</span><span>Hair inspiration</span></div>
        <Link className="campaign-inset" href="/collections"><div className="campaign-inset-image"><Image src="/assets/campaign/hair-collection.webp" alt="Editorial inspiration: black hair pieces" fill sizes="140px" style={{ objectFit: "cover" }} /></div><div><span>MEET YOUR NEXT LOOK</span><b>The collection</b><span className="inset-link">Explore <span aria-hidden="true">↗</span></span></div></Link>
      </div>
    </section>
    <EditorialMarquee />

    {content.showBeautyEdit && <section id="hair-edit" className="section hair-edit" aria-labelledby="collections-heading">
      <div className="section-heading" data-reveal><div><div className="eyebrow">A LOOK FOR EVERY YOU</div><h2 id="collections-heading">Find your <em>signature.</em></h2></div><div className="section-intro"><p>From sleek and understated to a little more statement. Start with what feels like you.</p><Link href="/collections" className="text-link">Explore all collections <span aria-hidden="true">↗</span></Link></div></div>
      <CollectionCards />
      <p className="editorial-disclosure">Editorial style inspiration. See product pages for actual items and availability.</p>
    </section>}

    {content.showCollection && <section className="section featured-edit" aria-labelledby="featured-heading">
      <div className="section-heading" data-reveal><div><div className="eyebrow">THE COLLECTION, CONSIDERED</div><h2 id="featured-heading">Your next <em>favourite.</em></h2></div><Link href="/products" className="text-link">Browse the shop <span aria-hidden="true">↗</span></Link></div>
      {products.length ? <div className="category-grid">{products.slice(0, 3).map((product) => <Link href={`/products/${product.slug}`} className="image-card" key={product.id}><div className="image-card-media">{product.media[0] ? <Image src={product.media[0].src} alt={product.media[0].alt} fill sizes="(max-width:640px) 100vw, 33vw" style={{ objectFit: "cover" }} /> : <div className="media-fallback">Product photo coming soon</div>}</div><div className="card-line"><h3>{product.title}</h3><span aria-hidden="true">↗</span></div><p>{productPriceLabel(product)}</p></Link>)}</div> : <div className="collection-preview" data-reveal><div className="collection-preview-photo"><Image src="/assets/campaign/hair-collection.webp" fill alt="Editorial inspiration, not available inventory" sizes="(max-width: 640px) 100vw, 40vw" style={{ objectFit: "cover" }} /><span>EDITORIAL INSPIRATION</span></div><div className="collection-preview-copy"><span className="eyebrow">GOOD HAIR STARTS WITH A CONVERSATION</span><h3>Let’s find the<br /><em>one for you.</em></h3><p>Our published catalogue is on its way. In the meantime, tell us the look you have in mind and ask about available options.</p><Link className="text-link" href="/contact">Talk to KEO Hairven <span aria-hidden="true">↗</span></Link></div></div>}
    </section>}

    {content.showNailEditorial && <section className="lookbook-feature" aria-labelledby="lookbook-heading">
      <div className="lookbook-feature-photo" data-reveal="image"><Image src="/assets/campaign/braids-inspiration.webp" alt="Editorial inspiration: long braided hairstyle" fill sizes="(max-width: 640px) 100vw, 55vw" style={{ objectFit: "cover", objectPosition: "50% 28%" }} /><span className="lookbook-photo-caption">THE LOOKBOOK / EDITORIAL INSPIRATION</span></div>
      <div className="lookbook-feature-copy" data-reveal><div className="eyebrow">A LITTLE INSPIRATION</div><h2 id="lookbook-heading">A whole<br />new <em>mood.</em></h2><p>The sleek days. The statement days. The just-because days. Find a look that speaks to yours.</p><Link href="/gallery" className="button button-outline">Step into the lookbook <span aria-hidden="true">↗</span></Link><div className="lookbook-small-note">See a style you love? Ask us about similar options.</div></div>
    </section>}

    <section className="section brand-manifesto" data-reveal aria-labelledby="promise-heading"><div className="eyebrow">MORE THAN A FINISHING TOUCH</div><h2 id="promise-heading">Hair is personal.<br /><em>So is confidence.</em></h2><div className="manifesto-bottom"><span className="manifesto-star" aria-hidden="true">✦</span><p>It’s how you show up, how you switch things up, how you feel like yourself. At KEO Hairven, we’re here to help you explore the possibilities.</p><Link href="/about" className="text-link">The KEO story <span aria-hidden="true">↗</span></Link></div></section>

    {content.showHowItWorks && <section className="section enquiry-journey" aria-labelledby="journey-heading"><div className="journey-heading" data-reveal><div className="eyebrow">YOUR LOOK STARTS HERE</div><h2 id="journey-heading">From a little browsing<br />to <em>“that’s the one.”</em></h2><Link href="/faq" className="text-link">A few helpful answers <span aria-hidden="true">↗</span></Link></div><ol className="journey-steps"><li data-reveal><span className="journey-number">01</span><h3>Find your look</h3><p>Explore the collections and save a little inspiration for your next style.</p></li><li data-reveal><span className="journey-number">02</span><h3>Make it yours</h3><p>Choose from the lengths, colours and specifications on a published product.</p></li><li data-reveal><span className="journey-number">03</span><h3>Let’s talk details</h3><p>Confirm availability, delivery and payment with us directly before you commit.</p></li></ol></section>}
    <WhatsAppCta />
  </main><SiteFooter /></>;
}

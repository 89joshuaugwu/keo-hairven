"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ProductDetailModel, ProductVariant } from "@/lib/products";
import { productEnquiryMessage, variantPriceLabel } from "@/lib/products";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { publicMediaLabel } from "@/lib/public-media-label";
import { whatsappUrl } from "@/lib/site";

const faqs = [
  {
    question: "What exactly is included?",
    answer: "Product specifications appear above when confirmed. Ask us to clarify material, colour or lace details before purchasing.",
  },
  {
    question: "How do I buy this?",
    answer: "Choose the option you want to ask about, open WhatsApp, review the prefilled message and send it to KEO Hairven. The current price and availability are confirmed in chat.",
  },
  {
    question: "Can this be sent to my location?",
    answer: "Send your destination on WhatsApp. KEO Hairven will confirm the available waybill option, cost and timing before you commit.",
  },
];

export function ProductDetailClient({ product, initialVariantId }: { product: ProductDetailModel; initialVariantId: string }) {
  const business = usePublicBusiness();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialVariantId);
  const [failed, setFailed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const selected = useMemo(
    () => product.variants.find((variant) => variant.id === selectedId) ?? product.variants[0],
    [product.variants, selectedId]
  );
  const image = product.media[photoIndex] || product.media[0];
  const whatsapp = whatsappUrl(productEnquiryMessage(selected, product), business.whatsappDigits);
  const waybill = whatsappUrl(
    `Hi KEO Hairven! I’m interested in ${selected.title}. I’d also like to discuss waybill. ${business.deliveryNote}`,
    business.whatsappDigits
  );

  const selectVariant = (variant: ProductVariant) => {
    setSelectedId(variant.id);
    if (variant.slug) router.replace(`/products/${variant.slug}`, { scroll: false });
  };


  return (
    <>
      <div className="product-detail-grid">
        <figure className="product-detail-media">
          <div className="product-detail-image">
            {!failed && image ? (
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: image.focal || "50% 50%" }}
                onError={() => setFailed(true)}
              />
            ) : (
              <div className="media-fallback" role="img" aria-label="Product preview image unavailable">
                <span>Image unavailable</span>
                <small>{product.familyTitle}</small>
              </div>
            )}
          </div>
          {image?.caption && <figcaption>{publicMediaLabel(image.caption)}</figcaption>}
          {product.media.length > 1 && <div className="product-media-thumbnails" aria-label="Product photos">{product.media.map((photo,index)=><button key={`${photo.src}-${index}`} type="button" aria-label={`View product photo ${index+1}`} aria-pressed={photoIndex===index} onClick={()=>{setPhotoIndex(index);setFailed(false);}}><Image src={photo.src} alt={photo.alt} width={72} height={86}/></button>)}</div>}
        </figure>

        <div className="product-detail-copy">
          <div className="eyebrow">THE HAIR COLLECTION</div>
          <h1>{product.titleLines[0]}{product.titleLines[1] ? <><br /><em>{product.titleLines[1]}</em></> : null}</h1>
          <p>{product.description}</p>

          <div className="product-big-price" aria-live="polite">{variantPriceLabel(selected)}</div>
          <div className="product-price-note">
            {selected.priceMode === "hidden" || selected.priceMode === "quote"
              ? "Ask for the current price and availability"
              : "Listed price · confirm current price and availability"}
          </div>

          <dl className="keo-specs">{([
            ["Product type",product.productType],["Hair material",product.hairMaterial],["Texture",product.hairTexture],["Colour",product.hairColour],["Density",product.hairDensity],["Lace / closure",product.laceType],["Reference",product.sku],
          ] as const).filter(([,value])=>Boolean(value)).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {product.careInstructions && <p><strong>Care:</strong> {product.careInstructions}</p>}
          <fieldset className="variant-fieldset">
            <legend>Choose your option</legend>
            <div className="variant-chips">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={variant.id === selected.id ? "is-selected" : ""}
                  aria-pressed={variant.id === selected.id}
                  onClick={() => selectVariant(variant)}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </fieldset>

          <a className="button button-primary product-enquire" href={whatsapp} target="_blank" rel="noopener noreferrer">
            {product.availability === "unavailable" ? "Ask about alternatives" : "Enquire on WhatsApp"} <span aria-hidden="true">↗</span>
          </a>
          <p className="product-micro">
            {selected.priceMode === "hidden" || selected.priceMode === "quote"
              ? "Your selected option and product link will be included in your message."
              : "Your selected option, listed price and product link will be included in your message."}
          </p>


          <div className="product-info-links">
            <a className="product-info-row" href={waybill} target="_blank" rel="noopener noreferrer">
              <div><b>Waybill available to discuss</b><p>Delivery destination, cost and timing confirmed in chat.</p></div>
              <span aria-hidden="true">↗</span>
            </a>
            <a className="product-info-row" href={whatsapp} target="_blank" rel="noopener noreferrer">
              <div><b>Need help choosing?</b><p>Contact KEO Hairven for advice on the right option.</p></div>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>

      <section className="product-faqs" aria-label="Product questions">
        {faqs.map((faq, index) => {
          const open = openFaq === index;
          return (
            <div className="product-faq" key={faq.question}>
              <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : index)}>
                <span>{faq.question}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
              </button>
              {open && <p>{faq.answer}</p>}
            </div>
          );
        })}
      </section>
    </>
  );
}

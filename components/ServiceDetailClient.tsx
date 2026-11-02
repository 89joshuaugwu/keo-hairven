"use client";

import Image from "next/image";
import { BrandCalendar, lagosTodayIso } from "@/components/BrandCalendar";
import { useMemo, useState } from "react";
import type { ServiceFamily } from "@/lib/services";
import { serviceEnquiryMessage } from "@/lib/services";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { whatsappUrl } from "@/lib/site";
import { publicMediaLabel } from "@/lib/public-media-label";


export function ServiceDetailClient({ service }: { service: ServiceFamily }) {
  const business = usePublicBusiness();
  const [preferredDate, setPreferredDate] = useState("");
  const [idea, setIdea] = useState("");
  const [dateError, setDateError] = useState("");
  const [failed, setFailed] = useState(false);

  const today = useMemo(() => lagosTodayIso(), []);
  const trimmedIdea = idea.trim();
  const ideaRemaining = 500 - idea.length;

  const message = serviceEnquiryMessage(service, preferredDate || undefined, trimmedIdea || undefined);
  const url = whatsappUrl(message, business.whatsappDigits);

  const onDateChange = (value: string) => {
    setPreferredDate(value);
    if (value && value < today) {
      setDateError("Please choose today or a future date. It will still be treated only as your preferred date.");
      return;
    }
    setDateError("");
  };

  return (
    <div className="service-detail-grid">
      <figure className="service-detail-media">
        <div className="service-detail-image">
          {!failed ? (
            <Image
              src={service.media.src}
              alt={service.media.alt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: "cover", objectPosition: service.media.focal || "50% 50%" }}
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="media-fallback" role="img" aria-label="Service image unavailable">
              <span>Image unavailable</span>
              <small>{service.categoryLabel}</small>
            </div>
          )}
        </div>
        <figcaption>{publicMediaLabel(service.media.caption)}</figcaption>
      </figure>

      <div className="service-detail-copy">
        <div className="eyebrow">{service.detailEyebrow}</div>
        <h1>
          {service.titleLines[0]}
          {service.titleLines[1] ? <><br /><em>{service.titleLines[1]}</em></> : null}
        </h1>
        <p>{service.detailDescription}</p>
        <span className="service-price-chip">{service.detailPriceLabel}</span>

        <div className="service-form-block">
          <h3>Tell us about your look</h3>

          <div className="service-field">
            <span>Preferred date (optional)</span>
            <BrandCalendar
              value={preferredDate}
              min={today}
              onChange={onDateChange}
              ariaLabel="Choose a preferred date"
              ariaDescribedBy={dateError ? "service-date-error" : "service-date-help"}
            />
          </div>
          {dateError ? (
            <p id="service-date-error" className="service-form-hint service-form-error">{dateError}</p>
          ) : (
            <p id="service-date-help" className="service-form-hint">Any date entered here is treated only as a preference.</p>
          )}

          <label className="service-field">
            <span>Your idea (optional)</span>
            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value.slice(0, 500))}
              placeholder={service.ideaPlaceholder}
              rows={4}
              maxLength={500}
            />
          </label>
          <div className="service-char-count" aria-live="polite">{ideaRemaining} characters remaining</div>

          <a className="button button-primary service-enquire-button" href={url} target="_blank" rel="noopener noreferrer">
            Discuss an appointment <span aria-hidden="true">↗</span>
          </a>
          <p className="service-microcopy">This sends an enquiry, not a confirmed booking. Your appointment is agreed on WhatsApp.</p>
        </div>

        <div className="service-guidance">
          {service.guideRows.map((item) => (
            <a
              key={item.title}
              className="look-guidance-row"
              href={whatsappUrl(`Hi KEO Hairven! I’d like to discuss ${service.categoryLabel.toLowerCase()}. ${item.body}`, business.whatsappDigits)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div>
                <b>{item.title}</b>
                <p>{item.body}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

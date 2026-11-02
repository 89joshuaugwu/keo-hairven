"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { MuseTrigger } from "@/components/MuseTrigger";
import { BrandSelect } from "@/components/BrandSelect";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { whatsappUrl } from "@/lib/site";

type Topic = "hair" | "products" | "waybill" | "other";

const topics = [
  { value: "hair", label: "Hair extensions & wigs" },
  { value: "products", label: "Products" },
  { value: "waybill", label: "Waybill" },
  { value: "other", label: "Other" },
] as const;

function topicPhrase(topic: Topic) {
  return topics.find((item) => item.value === topic)?.label ?? "Other";
}

async function copyText(value: string) {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function ContactEnquiry() {
  const business = usePublicBusiness();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [topic, setTopic] = useState<Topic>("products");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const composed = useMemo(() => {
    const lines = [`Hi KEO Hairven! I’d like to ask about ${topicPhrase(topic).toLowerCase()}.`];
    if (name.trim()) lines.push(`Name: ${name.trim()}`);
    if (message.trim()) lines.push(message.trim());
    return lines.join("\n");
  }, [message, name, topic]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    if (!message.trim()) {
      setError("Please add a short message explaining your hair enquiry.");
      messageRef.current?.focus();
      return;
    }
    setError("");
    if (!business.whatsappDigits) { setError("WhatsApp contact is not configured yet. Please check back soon."); return; }
    window.open(whatsappUrl(composed, business.whatsappDigits), "_blank", "noopener,noreferrer");
  };

  const copyMessage = async () => {
    const copied = await copyText(composed);
    setStatus(copied ? "Message copied." : "Copy is unavailable in this browser. Select the text manually if needed.");
  };

  const copyNumber = async () => {
    const copied = await copyText(business.whatsappDisplay);
    setStatus(copied ? "WhatsApp number copied." : `WhatsApp number: ${business.whatsappDisplay}`);
  };

  return (
    <div className="contact-main-grid">
      <aside className="contact-dark-card">
        <div className="eyebrow">CONTACT KEO</div>
        <h2>A little chat.<br />A lovely <em>new look.</em></h2>
        {business.whatsappE164 ? <a className="contact-phone" href={`tel:${business.whatsappE164}`}>{business.whatsappDisplay}</a> : <p>Our direct WhatsApp contact will be published here shortly.</p>}
        <div className="contact-dark-actions">
          {business.whatsappDigits ? <a className="button button-primary" href={whatsappUrl(`Hi ${business.name}! I found you through the website and I’d like to make an enquiry.`, business.whatsappDigits)} target="_blank" rel="noopener noreferrer">
            {business.whatsappDigits ? "Open WhatsApp" : "Contact details pending"} <span aria-hidden="true">↗</span>
          </a> : <MuseTrigger className="button button-light">Ask KEO Muse ✦</MuseTrigger>}
          {business.whatsappDigits ? <button className="button contact-copy-button" type="button" onClick={copyNumber}>Copy number</button> : null}
        </div>

        <div className="contact-dark-info">
          <div>
            <b>Location</b>
            <p>{business.publicLocation}</p>
          </div>
          <div>
            <b>Planning a visit?</b>
            {business.address ? <p>{business.address}</p> : <p>Ask for our exact meeting point before visiting.</p>}
            {business.hours ? <p className="contact-hours-note">{business.hours}</p> : <p className="contact-hours-note">Ask about current availability on WhatsApp.</p>}
          </div>
          <div>
            <b>Waybill enquiries</b>
            <p>{business.deliveryNote}</p>
          </div>
        </div>

        {(business.instagramUrl || business.tiktokUrl) ? (
          <div className="contact-social-links" aria-label="Social links">
            {business.instagramUrl ? <a href={business.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram ↗</a> : null}
            {business.tiktokUrl ? <a href={business.tiktokUrl} target="_blank" rel="noopener noreferrer">TikTok ↗</a> : null}
          </div>
        ) : null}
      </aside>

      <form className="contact-form" onSubmit={submit} noValidate>
        <div className="eyebrow">QUICK ENQUIRY</div>
        <h3>What can we help with?</h3>

        <div className="contact-field">
          <span>I’m interested in</span>
          <BrandSelect<Topic>
            value={topic}
            options={topics}
            onChange={setTopic}
            ariaLabel="Choose enquiry topic"
            className="contact-topic-select"
          />
        </div>

        <label className="contact-field">
          <span>Name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 80))}
            maxLength={80}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
        <div className="contact-field-count">{80 - name.length} characters remaining</div>

        <label className="contact-field">
          <span>Your message</span>
          <textarea
            ref={messageRef}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, 1000));
              if (error) setError("");
            }}
            maxLength={1000}
            rows={5}
            placeholder="Tell us a little about your style or question."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "contact-message-error" : undefined}
          />
        </label>
        <div className="contact-field-count">{1000 - message.length} characters remaining</div>
        {error && <p className="contact-form-error" id="contact-message-error">{error}</p>}

        <div className="contact-form-actions">
          <button className="button button-primary" type="submit" disabled={!business.whatsappDigits}>
            Continue to WhatsApp <span aria-hidden="true">↗</span>
          </button>
          <button className="button button-outline" type="button" onClick={copyMessage}>Copy message</button>
        </div>
        {!business.whatsappDigits && <p className="contact-form-micro">Direct contact is being set up. You can copy your message, or ask KEO Muse about the website.</p>}
        <p className="contact-form-micro">You’ll review and send the message in WhatsApp. This form does not confirm an order.</p>
        {status && <p className="contact-copy-status" role="status">{status}</p>}
      </form>
    </div>
  );
}

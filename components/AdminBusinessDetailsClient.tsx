"use client";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { ModalDialog } from "@/components/ModalDialog";

import Image from "next/image";
import { useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { AdminSiteSetupPanel } from "@/components/AdminSiteSetupPanel";
import type { SiteSetupStatus } from "@/lib/site-setup-shared";
import {
  displayPhoneFromE164,
  isValidE164,
  normalizeWhatsAppE164,
  type AdminBusinessSettings,
} from "@/lib/business-settings";
import { whatsappUrl } from "@/lib/site";

type Role = "owner" | "editor";
type FieldErrors = Record<string, string>;

type SaveResponse = {
  ok?: boolean;
  revision?: number;
  settings?: AdminBusinessSettings;
  message?: string;
  code?: string;
  fieldErrors?: FieldErrors;
};

function previewDigits(value: string) {
  const normalized = normalizeWhatsAppE164(value);
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized.replace(/^\+/, "") : "2348012345678";
}

export function AdminBusinessDetailsClient({ initialSettings, role, initialSetupStatus }: { initialSettings: AdminBusinessSettings; role: Role; initialSetupStatus: SiteSetupStatus }) {
  const [settings, setSettings] = useState<AdminBusinessSettings>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const canEdit = role === "owner";

  const displayPhone = useMemo(() => displayPhoneFromE164(settings.whatsappE164), [settings.whatsappE164]);
  const previewWhatsapp = useMemo(() => whatsappUrl(`Hi ${settings.name || "KEO Hairven"}! I found you through the website and I’d like to make an enquiry.`, previewDigits(settings.whatsappE164)), [settings.name, settings.whatsappE164]);

  const update = <K extends keyof AdminBusinessSettings>(key: K, value: AdminBusinessSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSaveState("idle");
    setFeedback("");
    if (fieldErrors[String(key)]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[String(key)];
        return next;
      });
    }
  };

  const clientValidate = () => {
    const errors: FieldErrors = {};
    if (!settings.name.trim()) errors.name = "Add the public brand name.";
    if (!settings.tagline.trim()) errors.tagline = "Add the brand tagline.";
    if (!isValidE164(settings.whatsappE164)) errors.whatsappE164 = "Use international format, for example +2348012345678.";
    if (!settings.publicLocation.trim()) errors.publicLocation = "Add the general public location.";
    if (!settings.deliveryNote.trim()) errors.deliveryNote = "Add the waybill/delivery note.";
    for (const [key, value, host] of [["instagramUrl", settings.instagramUrl, "instagram.com"], ["tiktokUrl", settings.tiktokUrl, "tiktok.com"]] as const) {
      if (!value.trim()) continue;
      try {
        const url = new URL(value.trim());
        if (!url.hostname.toLowerCase().replace(/^www\./, "").endsWith(host)) errors[key] = `Use a ${host} URL or leave this blank.`;
      } catch { errors[key] = `Use a valid ${host} URL or leave this blank.`; }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    if (!canEdit) {
      setFeedback("Only the owner can change business-wide settings.");
      return;
    }
    if (!clientValidate()) {
      setSaveState("error");
      setFeedback("Review the highlighted fields before saving.");
      return;
    }
    setSaveState("saving");
    setFeedback("");
    try {
      const response = await adminFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings, expectedRevision: settings.revision }),
      });
      const payload = await response.json().catch(() => ({})) as SaveResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors || {});
        setSaveState("error");
        setFeedback(payload.message || "The business details could not be saved.");
        return;
      }
      const next = payload.settings || { ...settings, revision: payload.revision ?? settings.revision + 1 };
      setSettings(next);
      setDirty(false);
      setSaveState("saved");
      setFeedback(payload.message || "Business details saved and published.");
    } catch {
      setSaveState("error");
      setFeedback("The business details could not be saved. Check your connection and try again.");
    }
  };

  const field = (key: keyof FieldErrors) => fieldErrors[String(key)];

  const previewCard = (modal = false) => (
    <div className={`admin-settings-customer-card${modal ? " is-modal" : ""}`}>
      <Image src="/assets/brand/keo-hairven-wordmark.png" alt={settings.name || "KEO Hairven"} width={1200} height={810} />
      <p className="admin-settings-preview-tagline">{settings.tagline || "Unveil the beauty within."}</p>
      <div className="eyebrow">CONTACT</div>
      <h2>Let’s talk about<br />your <em>next look.</em></h2>
      <div className="admin-settings-preview-details">
        <div><b>Location</b><p>{settings.publicLocation || "Location not provided"}</p></div>
        {settings.address.trim() ? <div><b>Meeting point</b><p>{settings.address}</p></div> : null}
        {settings.hours.trim() ? <div><b>Opening hours</b><p>{settings.hours}</p></div> : null}
        <div><b>Waybill</b><p>{settings.deliveryNote || "Delivery details are confirmed on WhatsApp."}</p></div>
      </div>
      <a className="admin-settings-preview-phone" href={`tel:${normalizeWhatsAppE164(settings.whatsappE164)}`}>{displayPhone}</a>
      <a className="button button-primary" href={previewWhatsapp} target="_blank" rel="noopener noreferrer">Chat on WhatsApp ↗</a>
      {(settings.instagramUrl.trim() || settings.tiktokUrl.trim()) ? (
        <div className="admin-settings-preview-socials">
          {settings.instagramUrl.trim() ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram ↗</a> : null}
          {settings.tiktokUrl.trim() ? <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer">TikTok ↗</a> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <main className="admin-settings-content">
      <header className="admin-settings-head">
        <div className="eyebrow">KEO HAIRVEN</div>
        <h1>Business details</h1>
        <p>Keep the contact, location and delivery information used across the public website accurate.</p>
      </header>

      {!canEdit ? <div className="admin-settings-notice">You can review these details, but only the owner can publish business-wide changes.</div> : null}
      {feedback ? <div className={`admin-settings-feedback${saveState === "error" ? " is-error" : saveState === "saved" ? " is-success" : ""}`} role="status">{feedback}</div> : null}

      <div className="admin-settings-grid">
        <div className="admin-settings-left">
          <section className="admin-editor-panel admin-settings-panel">
            <h2>Contact &amp; location</h2>
            <label className="admin-editor-field">
              <span>Brand name</span>
              <input value={settings.name} maxLength={100} disabled={!canEdit} onChange={(event) => update("name", event.target.value)} />
              {field("name") ? <small className="admin-settings-field-error">{field("name")}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>Tagline</span>
              <input value={settings.tagline} maxLength={140} disabled={!canEdit} onChange={(event) => update("tagline", event.target.value)} />
              <small>Used beneath the brand mark in the public footer.</small>
              {field("tagline") ? <small className="admin-settings-field-error">{field("tagline")}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>WhatsApp number</span>
              <input value={settings.whatsappE164} maxLength={24} inputMode="tel" autoComplete="tel" disabled={!canEdit} onChange={(event) => update("whatsappE164", event.target.value)} placeholder="+2348012345678" />
              <small>International E.164 format. This powers every website enquiry button.</small>
              {field("whatsappE164") ? <small className="admin-settings-field-error">{field("whatsappE164")}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>Public location</span>
              <input value={settings.publicLocation} maxLength={160} disabled={!canEdit} onChange={(event) => update("publicLocation", event.target.value)} placeholder="Nigeria" />
              <small>Use the general location you are comfortable showing publicly.</small>
              {field("publicLocation") ? <small className="admin-settings-field-error">{field("publicLocation")}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>Exact address (optional)</span>
              <textarea rows={3} value={settings.address} maxLength={300} disabled={!canEdit} onChange={(event) => update("address", event.target.value)} placeholder="Leave blank if customers should ask on WhatsApp" />
              <small>Hidden everywhere on the public site while left blank.</small>
            </label>
            <label className="admin-editor-field">
              <span>Opening hours (optional)</span>
              <textarea rows={3} value={settings.hours} maxLength={300} disabled={!canEdit} onChange={(event) => update("hours", event.target.value)} placeholder="e.g. Mon–Sat, appointments by arrangement" />
              <small>Displayed as plain information only. The site will not claim “Open now”.</small>
            </label>
          </section>

          <section className="admin-editor-panel admin-settings-panel">
            <h2>Waybill &amp; social links</h2>
            <label className="admin-editor-field">
              <span>Delivery note</span>
              <textarea rows={4} value={settings.deliveryNote} maxLength={500} disabled={!canEdit} onChange={(event) => update("deliveryNote", event.target.value)} />
              <small>Used on Product, Contact and KEO Muse delivery guidance.</small>
              {field("deliveryNote") ? <small className="admin-settings-field-error">{field("deliveryNote")}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>Instagram URL (optional)</span>
              <input type="url" value={settings.instagramUrl} maxLength={500} disabled={!canEdit} onChange={(event) => update("instagramUrl", event.target.value)} placeholder="https://instagram.com/..." />
              {field("instagramUrl") ? <small className="admin-settings-field-error">{field("instagramUrl")}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>TikTok URL (optional)</span>
              <input type="url" value={settings.tiktokUrl} maxLength={500} disabled={!canEdit} onChange={(event) => update("tiktokUrl", event.target.value)} placeholder="https://tiktok.com/@..." />
              {field("tiktokUrl") ? <small className="admin-settings-field-error">{field("tiktokUrl")}</small> : null}
            </label>
          </section>
        </div>

        <aside className="admin-editor-panel admin-settings-preview-panel">
          <h2>How customers see you</h2>
          {previewCard()}
          <div className="admin-settings-preview-notice">Missing optional details stay hidden. Saving this page updates the public contact information immediately.</div>
        </aside>
      </div>

      <AdminSiteSetupPanel initialStatus={initialSetupStatus} role={role} />

      <div className="admin-settings-savebar">
        <span>{dirty ? "Unsaved changes" : saveState === "saved" ? `Published · revision ${settings.revision}` : `All details stay editable · revision ${settings.revision}`}</span>
        <button type="button" className="button button-outline" onClick={() => setPreviewOpen(true)}>Preview</button>
        <button type="button" className="button button-primary" disabled={!canEdit || saveState === "saving"} onClick={() => void save()}>{saveState === "saving" ? "Saving…" : "Save changes"}</button>
      </div>

      {previewOpen ? (
        <ModalDialog open onClose={() => setPreviewOpen(false)} label="Business details preview" className="studio-media-dialog"><section className="admin-media-modal admin-settings-preview-modal">
            <div className="admin-media-modal-head"><div><div className="eyebrow">CUSTOMER PREVIEW</div><h2>Business details</h2></div><button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}>×</button></div>
            {previewCard(true)}
          </section></ModalDialog>
      ) : null}
    <UnsavedChangesGuard dirty={dirty} /></main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandSelect, type BrandSelectOption } from "@/components/BrandSelect";
import { adminFetch } from "@/lib/admin-client";
import type { AdminLibraryMedia } from "@/lib/admin-media-shared";
import type { AdminContentDraft, AdminFaqRecord } from "@/lib/site-content";

const faqCategoryOptions: readonly BrandSelectOption<AdminFaqRecord["category"]>[] = [
  { value: "getting-started", label: "Getting started" },
  { value: "appointments", label: "Appointments" },
  { value: "products-pricing", label: "Products & pricing" },
  { value: "waybill-delivery", label: "Waybill & delivery" },
];

type HomeVisibilityKey = "showBeautyEdit" | "showNailEditorial" | "showCollection" | "showHowItWorks";

const homeSectionToggles: readonly { key: HomeVisibilityKey; label: string; help: string }[] = [
  { key: "showBeautyEdit", label: "Shop by collection", help: "Hair collection cards beneath the hero." },
  { key: "showNailEditorial", label: "Hair editorial", help: "Hair-focused editorial section." },
  { key: "showCollection", label: "Hair collection", help: "The hair collection feature and collection call-to-action." },
  { key: "showHowItWorks", label: "Three easy steps", help: "The discovery-to-WhatsApp explanation near the end of Home." },
];

type RemovedFaq = { id: string; revision?: number; sourceStarterId?: string; faq: AdminFaqRecord };
type MediaTarget = "home" | "about" | null;

type Props = {
  initialContent: AdminContentDraft;
  initialFaqs: AdminFaqRecord[];
  initialTrashedFaqs: AdminFaqRecord[];
  media: AdminLibraryMedia[];
};

function makeFaq(): AdminFaqRecord {
  const id = `faq-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    category: "getting-started",
    question: "",
    answer: "",
    sortOrder: 100,
    status: "draft",
    revision: 0,
  };
}

function splitPhrases(value: string) {
  return value.split("/").map((item) => item.trim()).filter(Boolean).slice(0, 5);
}

function mediaLabel(item: AdminLibraryMedia | undefined) {
  if (!item) return "Media not found";
  return item.caption || item.alt || item.label;
}

export function AdminContentEditor({ initialContent, initialFaqs, initialTrashedFaqs, media }: Props) {
  const [content, setContent] = useState<AdminContentDraft>({ ...initialContent, rotatingPhrases: [...initialContent.rotatingPhrases], suppressedFaqIds: [...initialContent.suppressedFaqIds] });
  const [faqs, setFaqs] = useState<AdminFaqRecord[]>(initialFaqs.map((item) => ({ ...item })));
  const [removedFaqs, setRemovedFaqs] = useState<RemovedFaq[]>([]);
  const [trashedFaqs, setTrashedFaqs] = useState<AdminFaqRecord[]>(initialTrashedFaqs.map((item) => ({ ...item })));
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget>(null);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  const activeMedia = useMemo(() => media.filter((item) => item.status === "active"), [media]);
  const homeMedia = activeMedia.find((item) => item.id === content.homeHeroMediaId);
  const aboutMedia = activeMedia.find((item) => item.id === content.aboutMediaId);
  const rotatingText = content.rotatingPhrases.join(" / ");

  const markDirty = () => {
    setDirty(true);
    if (saveState === "saved") setSaveState("idle");
    setFeedback("");
  };

  const updateContent = <K extends keyof AdminContentDraft>(key: K, value: AdminContentDraft[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    markDirty();
  };

  const updateFaq = (id: string, patch: Partial<AdminFaqRecord>) => {
    setFaqs((current) => current.map((faq) => faq.id === id ? { ...faq, ...patch } : faq));
    markDirty();
  };

  const moveFaq = (id: string, direction: -1 | 1) => {
    setFaqs((current) => {
      const index = current.findIndex((faq) => faq.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy.map((item, order) => ({ ...item, sortOrder: order + 1 }));
    });
    markDirty();
  };

  const removeFaq = (faq: AdminFaqRecord) => {
    setFaqs((current) => current.filter((item) => item.id !== faq.id).map((item, index) => ({ ...item, sortOrder: index + 1 })));
    setRemovedFaqs((current) => [...current, { id: faq.id, revision: faq.revision, sourceStarterId: faq.sourceStarterId, faq }]);
    if (editingFaqId === faq.id) setEditingFaqId(null);
    markDirty();
  };

  const addFaq = () => {
    const faq = makeFaq();
    setFaqs((current) => [...current, { ...faq, sortOrder: current.length + 1 }]);
    setEditingFaqId(faq.id);
    markDirty();
  };

  const restoreRemovedFaq = (removed: RemovedFaq) => {
    setRemovedFaqs((current) => current.filter((item) => item.id !== removed.id));
    setFaqs((current) => [...current, { ...removed.faq, status: "draft", sortOrder: current.length + 1 }]);
    markDirty();
  };

  const restorePersistedFaq = (faq: AdminFaqRecord) => {
    setTrashedFaqs((current) => current.filter((item) => item.id !== faq.id));
    setFaqs((current) => [...current, { ...faq, status: "draft", sortOrder: current.length + 1 }]);
    markDirty();
  };

  const saveDraft = async () => {
    setSaveState("saving");
    setFeedback("");
    setFieldErrors({});
    try {
      const response = await adminFetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, expectedRevision: content.revision, faqs, removedFaqs }),
      });
      const data = await response.json() as { revision?: number; faqRevisions?: Record<string, number>; suppressedFaqIds?: string[]; message?: string; code?: string };
      if (!response.ok || !Number.isInteger(data.revision)) {
        setSaveState(data.code === "conflict" ? "conflict" : "error");
        setFeedback(data.message || "The website draft could not be saved.");
        return null;
      }
      const revision = Number(data.revision);
      setContent((current) => ({ ...current, revision, suppressedFaqIds: data.suppressedFaqIds || current.suppressedFaqIds }));
      setFaqs((current) => current.map((faq) => ({
        ...faq,
        revision: data.faqRevisions?.[faq.id] ?? faq.revision,
        status: "draft",
        preview: false,
      })));
      setTrashedFaqs((current) => [
        ...current,
        ...removedFaqs.map((item) => ({ ...item.faq, status: "trashed" as const, revision: (item.revision || 0) + 1 })),
      ].filter((faq, index, all) => all.findIndex((item) => item.id === faq.id) === index));
      const freshResponse=await adminFetch("/api/admin/content",{cache:"no-store"});
      if(freshResponse.ok){const fresh=await freshResponse.json();setTrashedFaqs(fresh.trashedFaqs||[]);}
      setRemovedFaqs([]);
      setDirty(false);
      setSaveState("saved");
      setFeedback("Changes saved as draft.");
      return revision;
    } catch {
      setSaveState("error");
      setFeedback("The website draft could not be saved. Please try again.");
      return null;
    }
  };

  const publish = async () => {
    const revision = dirty || removedFaqs.length ? await saveDraft() : content.revision;
    if (revision == null) return;
    setSaveState("saving");
    setFeedback("Publishing changes…");
    setFieldErrors({});
    try {
      const response = await adminFetch("/api/admin/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      const data = await response.json() as { revision?: number; faqRevisions?: Record<string, number>; fieldErrors?: Record<string, string>; message?: string; code?: string };
      if (!response.ok || !Number.isInteger(data.revision)) {
        setSaveState(data.code === "conflict" ? "conflict" : "error");
        setFeedback(data.message || "The website changes could not be published.");
        setFieldErrors(data.fieldErrors || {});
        return;
      }
      setContent((current) => ({ ...current, revision: Number(data.revision) }));
      setFaqs((current) => current.map((faq) => ({ ...faq, revision: data.faqRevisions?.[faq.id] ?? faq.revision, status: "published", preview: false })));
      setDirty(false);
      setSaveState("saved");
      setFeedback("Website content published. Your public pages now use this approved version.");
    } catch {
      setSaveState("error");
      setFeedback("The website changes could not be published. Please try again.");
    }
  };

  const selectedPreviewMedia = (item: AdminLibraryMedia | undefined, className: string) => {
    if (!item) return <div className={`${className} is-empty`}>Choose media</div>;
    if (item.resourceType === "video") return <video className={className} src={item.secureUrl} muted loop playsInline autoPlay preload="metadata" aria-label={item.alt || item.label} />;
    return <div className={`${className} admin-content-image-wrap`}><Image src={item.secureUrl} alt={item.alt || item.label} fill sizes="(max-width: 700px) 100vw, 40vw" style={{ objectFit: "cover", objectPosition: `${item.focal.x * 100}% ${item.focal.y * 100}%` }} /></div>;
  };

  return (
    <main className="admin-content-content">
      <div className="admin-content-head">
        <div>
          <div className="eyebrow">KEO HAIRVEN</div>
          <h1>Make the website yours</h1>
        </div>
      </div>

      {feedback ? <div className={`admin-content-feedback${saveState === "error" || saveState === "conflict" ? " is-error" : ""}`}>{feedback}</div> : null}

      <div className="admin-content-grid">
        <div className="admin-content-left">
          <section className="admin-editor-panel admin-content-panel">
            <h2>Homepage</h2>
            <label className="admin-editor-field">
              <span>Main heading</span>
              <textarea value={content.homeHeading} maxLength={140} rows={2} onChange={(event) => updateContent("homeHeading", event.target.value)} />
              <small>Use a line break where you want the heading to wrap before the rotating phrase.</small>
              {fieldErrors.homeHeading ? <small className="is-error">{fieldErrors.homeHeading}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>Supporting text</span>
              <textarea value={content.homeSupportingText} maxLength={320} rows={3} onChange={(event) => updateContent("homeSupportingText", event.target.value)} />
              {fieldErrors.homeSupportingText ? <small className="is-error">{fieldErrors.homeSupportingText}</small> : null}
            </label>
            <label className="admin-editor-field">
              <span>Rotating words</span>
              <input value={rotatingText} maxLength={240} onChange={(event) => updateContent("rotatingPhrases", splitPhrases(event.target.value))} />
              <small>Separate phrases with / · up to five phrases.</small>
              {fieldErrors.rotatingPhrases ? <small className="is-error">{fieldErrors.rotatingPhrases}</small> : null}
            </label>
          </section>

          <section className="admin-editor-panel admin-content-panel admin-content-visibility">
            <div className="admin-editor-section-head">
              <div>
                <h2>Homepage sections</h2>
                <p>Show or hide supporting homepage sections without deleting their content. The hero and final WhatsApp call-to-action always remain visible.</p>
              </div>
            </div>
            <div className="admin-content-visibility-list">
              {homeSectionToggles.map((item) => {
                const enabled = content[item.key];
                return (
                  <div className="admin-content-visibility-row" key={item.key}>
                    <div><b>{item.label}</b><p>{item.help}</p></div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      className={`admin-content-switch${enabled ? " is-on" : ""}`}
                      onClick={() => updateContent(item.key, !enabled)}
                    >
                      <span aria-hidden="true" />
                      <em>{enabled ? "Shown" : "Hidden"}</em>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="admin-editor-panel admin-content-panel">
            <h2>About page</h2>
            <div className="admin-editor-two">
              <label className="admin-editor-field"><span>Heading</span><textarea rows={2} value={content.aboutHeadingLead} maxLength={120} onChange={(event) => updateContent("aboutHeadingLead", event.target.value)} /></label>
              <label className="admin-editor-field"><span>Emphasis</span><input value={content.aboutHeadingEmphasis} maxLength={70} onChange={(event) => updateContent("aboutHeadingEmphasis", event.target.value)} /></label>
            </div>
            <label className="admin-editor-field"><span>Introduction</span><textarea rows={3} value={content.aboutIntro} maxLength={360} onChange={(event) => updateContent("aboutIntro", event.target.value)} /></label>
            <div className="admin-editor-two">
              <label className="admin-editor-field"><span>Story heading</span><input value={content.aboutSectionLead} maxLength={100} onChange={(event) => updateContent("aboutSectionLead", event.target.value)} /></label>
              <label className="admin-editor-field"><span>Story emphasis</span><input value={content.aboutSectionEmphasis} maxLength={100} onChange={(event) => updateContent("aboutSectionEmphasis", event.target.value)} /></label>
            </div>
            <label className="admin-editor-field"><span>Story paragraph</span><textarea rows={4} value={content.aboutBody1} maxLength={1200} onChange={(event) => updateContent("aboutBody1", event.target.value)} /></label>
            <label className="admin-editor-field"><span>Second paragraph (optional)</span><textarea rows={3} value={content.aboutBody2} maxLength={1200} onChange={(event) => updateContent("aboutBody2", event.target.value)} /></label>
            {fieldErrors.aboutHeading || fieldErrors.aboutText ? <div className="admin-content-inline-error">{fieldErrors.aboutHeading || fieldErrors.aboutText}</div> : null}
          </section>

          <section className="admin-editor-panel admin-content-panel">
            <h2>Shared WhatsApp call-to-action</h2>
            <label className="admin-editor-field"><span>Eyebrow</span><input value={content.ctaEyebrow} maxLength={70} onChange={(event) => updateContent("ctaEyebrow", event.target.value)} /></label>
            <div className="admin-editor-two">
              <label className="admin-editor-field"><span>Heading</span><input value={content.ctaHeadingLead} maxLength={90} onChange={(event) => updateContent("ctaHeadingLead", event.target.value)} /></label>
              <label className="admin-editor-field"><span>Emphasis</span><input value={content.ctaHeadingEmphasis} maxLength={60} onChange={(event) => updateContent("ctaHeadingEmphasis", event.target.value)} /></label>
            </div>
            <label className="admin-editor-field"><span>Supporting text</span><textarea rows={3} value={content.ctaBody} maxLength={280} onChange={(event) => updateContent("ctaBody", event.target.value)} /></label>
            <label className="admin-editor-field"><span>Button label</span><input value={content.ctaButtonLabel} maxLength={60} onChange={(event) => updateContent("ctaButtonLabel", event.target.value)} /></label>
            {fieldErrors.cta ? <div className="admin-content-inline-error">{fieldErrors.cta}</div> : null}
          </section>

          <section className="admin-editor-panel admin-content-panel admin-content-faq-panel">
            <div className="admin-editor-section-head">
              <div><h2>FAQs</h2><p>Edit, add or reorder the approved public answers used by the FAQ page and Ask KEO.</p></div>
              <button type="button" className="button button-outline" onClick={addFaq}>+ Add question</button>
            </div>
            {fieldErrors.faqs ? <div className="admin-content-inline-error">{fieldErrors.faqs}</div> : null}
            <div className="admin-content-faqs">
              {faqs.map((faq, index) => {
                const editing = editingFaqId === faq.id;
                return (
                  <article className={`admin-content-faq${editing ? " is-editing" : ""}`} key={faq.id}>
                    <div className="admin-content-faq-summary">
                      <div><b>{faq.question || "Untitled question"}</b><p>{faq.answer || "Add an answer before publishing."}</p></div>
                      <div className="admin-content-faq-actions">
                        <button type="button" onClick={() => moveFaq(faq.id, -1)} disabled={index === 0} aria-label={`Move ${faq.question || "question"} up`}>↑</button>
                        <button type="button" onClick={() => moveFaq(faq.id, 1)} disabled={index === faqs.length - 1} aria-label={`Move ${faq.question || "question"} down`}>↓</button>
                        <button type="button" onClick={() => setEditingFaqId(editing ? null : faq.id)}>{editing ? "Done" : "Edit ↗"}</button>
                      </div>
                    </div>
                    {editing ? (
                      <div className="admin-content-faq-editor">
                        <label className="admin-editor-field"><span>Category</span><BrandSelect value={faq.category} options={faqCategoryOptions} onChange={(value) => updateFaq(faq.id, { category: value })} ariaLabel="FAQ category" /></label>
                        <label className="admin-editor-field"><span>Question</span><input value={faq.question} maxLength={180} onChange={(event) => updateFaq(faq.id, { question: event.target.value })} /></label>
                        <label className="admin-editor-field"><span>Answer</span><textarea rows={5} value={faq.answer} maxLength={1400} onChange={(event) => updateFaq(faq.id, { answer: event.target.value })} /></label>
                        {fieldErrors[`faq:${faq.id}`] ? <div className="admin-content-inline-error">{fieldErrors[`faq:${faq.id}`]}</div> : null}
                        <button type="button" className="admin-content-remove-faq" onClick={() => removeFaq(faq)}>Move question to Trash</button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <Link className="admin-recovery-link" href="/admin/trash">Recover saved removed questions in Trash ?</Link>
            {removedFaqs.length > 0 && (
              <div className="admin-content-trash">
                <div className="admin-content-trash-head"><b>Unsaved removals</b><span>These questions move to Trash when you save.</span></div>
                {removedFaqs.map(item => (
                  <div className="admin-content-trash-row" key={`removed-${item.faq.id}`}>
                    <div><b>{item.faq.question || "Untitled question"}</b><small>Not removed from the saved content yet</small></div>
                    <button type="button" className="button button-outline" onClick={() => restoreRemovedFaq(item)}>Undo removal</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="admin-content-right">
          <section className="admin-editor-panel admin-content-media-stack">
            <h2>Website media</h2>
            <div className="admin-content-media-item">
              <div className="admin-content-media-item-head"><b>Homepage media</b><span>Hero</span></div>
              <div className="admin-content-media-preview">{selectedPreviewMedia(homeMedia, "admin-content-media-visual")}</div>
              <p>{mediaLabel(homeMedia)}</p>
              <button type="button" className="button button-outline" onClick={() => setMediaTarget("home")}>Change homepage media</button>
              <small>Images and short videos from Media library can be used here.</small>
            </div>
            <div className="admin-content-media-item">
              <div className="admin-content-media-item-head"><b>About media</b><span>Story</span></div>
              <div className="admin-content-media-preview is-portrait">{selectedPreviewMedia(aboutMedia, "admin-content-media-visual")}</div>
              <p>{mediaLabel(aboutMedia)}</p>
              <button type="button" className="button button-outline" onClick={() => setMediaTarget("about")}>Change About media</button>
            </div>
          </section>
        </aside>
      </div>

      <div className="admin-content-savebar">
        <span>{dirty ? "Unsaved changes" : saveState === "saved" ? "Changes saved as draft" : `Draft revision ${content.revision}`}</span>
        <button type="button" className="button button-outline" onClick={() => void saveDraft()} disabled={saveState === "saving"}>{saveState === "saving" ? "Saving…" : "Save draft"}</button>
        <button type="button" className="button button-outline" onClick={() => setPreviewOpen(true)}>Preview</button>
        <button type="button" className="button button-primary" onClick={() => void publish()} disabled={saveState === "saving"}>Publish changes</button>
      </div>

      {mediaTarget ? (
        <div className="admin-media-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMediaTarget(null); }}>
          <section className="admin-media-modal admin-content-picker" role="dialog" aria-modal="true" aria-label="Choose website media">
            <div className="admin-media-modal-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h2>Choose media</h2></div><button type="button" aria-label="Close media picker" onClick={() => setMediaTarget(null)}>×</button></div>
            <div className="admin-content-picker-grid">
              {activeMedia.map((item) => (
                <button key={item.id} type="button" onClick={() => { updateContent(mediaTarget === "home" ? "homeHeroMediaId" : "aboutMediaId", item.id); setMediaTarget(null); }}>
                  <span className="admin-content-picker-thumb">
                    {item.resourceType === "video" ? <video src={item.secureUrl} muted playsInline preload="metadata" /> : <Image src={item.secureUrl} alt="" fill sizes="180px" style={{ objectFit: "cover", objectPosition: `${item.focal.x * 100}% ${item.focal.y * 100}%` }} />}
                    <i>{item.resourceType === "video" ? "VIDEO" : "IMAGE"}</i>
                  </span>
                  <b>{item.label}</b><small>{item.caption || item.alt}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="admin-media-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
          <section className="admin-media-modal admin-content-preview-modal" role="dialog" aria-modal="true" aria-label="Website content preview">
            <div className="admin-media-modal-head"><div><div className="eyebrow">DRAFT PREVIEW</div><h2>Review before publishing</h2></div><button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}>×</button></div>
            <div className="admin-content-preview-grid">
              <article><div className="eyebrow">HOME</div><h3>{content.homeHeading.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}<br /></span>)}<em>{content.rotatingPhrases[0]}</em></h3><p>{content.homeSupportingText}</p></article>
              <article><div className="eyebrow">ABOUT</div><h3>{content.aboutHeadingLead} <em>{content.aboutHeadingEmphasis}</em></h3><p>{content.aboutIntro}</p></article>
              <article className="is-dark"><div className="eyebrow">{content.ctaEyebrow}</div><h3>{content.ctaHeadingLead} <em>{content.ctaHeadingEmphasis}</em></h3><p>{content.ctaBody}</p><span className="button button-primary">{content.ctaButtonLabel} ↗</span></article>
              <article><div className="eyebrow">FAQS</div><h3>{faqs.length} approved answers</h3><p>{faqs.slice(0, 3).map((faq) => faq.question).join(" · ")}</p></article>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

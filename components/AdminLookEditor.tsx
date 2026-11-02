"use client";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { ModalDialog } from "@/components/ModalDialog";
import { useCategoryOptions, useCategoryLabel } from "@/components/CategoryProvider";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandSelect, type BrandSelectOption } from "@/components/BrandSelect";
import { adminFetch } from "@/lib/admin-client";
import type { AdminMediaRecord } from "@/lib/admin-product-shared";
import type { AdminLookRecord } from "@/lib/look-admin-shared";
import { lookCategoryLabel, lookProvenanceLabel, type AdminLookPriceMode } from "@/lib/look-admin-shared";
import type { LookCategory, LookMedia, LookProvenance } from "@/lib/gallery";

const provenanceOptions: readonly BrandSelectOption<LookProvenance>[] = [
  { value: "real-work", label: "KEO Hairven’s work" },
  { value: "inspiration", label: "Style inspiration" },
  { value: "campaign", label: "Campaign inspiration" },
];
const priceOptions: readonly BrandSelectOption<AdminLookPriceMode>[] = [
  { value: "quote", label: "Ask for a quote" },
  { value: "fixed", label: "Fixed price" },
  { value: "from", label: "From price" },
  { value: "hidden", label: "Do not show a price" },
];

type UploadState = { mode: "idle" | "signing" | "uploading" | "finalising" | "error"; progress: number; message?: string };

type Props = {
  initialLook: AdminLookRecord;
  initialMedia: AdminMediaRecord[];
  starterFallbackMedia?: LookMedia[];
  isNew: boolean;
};

function nairaInput(minor?: number) { return Number.isInteger(minor) ? String((minor as number) / 100) : ""; }
function toMinor(value: string) { const number = Number(value.replace(/,/g, "")); return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : undefined; }

async function readVideoDuration(file: File) {
  return await new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); resolve(duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read the video.")); };
    video.src = url;
  });
}

export function AdminLookEditor({ initialLook, initialMedia, starterFallbackMedia = [], isNew }: Props) {
  const categoryLabel=useCategoryLabel("gallery");
  const categoryOptions = useCategoryOptions("gallery","Choose a category","");
  const router = useRouter();
  const [recordId, setRecordId] = useState(isNew ? "" : initialLook.id);
  const [revision, setRevision] = useState(isNew ? 0 : initialLook.revision);
  const [status, setStatus] = useState(initialLook.preview ? "draft" : initialLook.status);
  const [title, setTitle] = useState(initialLook.title || "");
  const [category, setCategory] = useState<"" | LookCategory>(initialLook.category || "");
  const [caption, setCaption] = useState(initialLook.caption || "");
  const [provenance, setProvenance] = useState<LookProvenance>(initialLook.provenance || "inspiration");
  const [generated, setGenerated] = useState(initialLook.generated);
  const [clientPermission, setClientPermission] = useState(initialLook.clientPermission);
  const [priceMode, setPriceMode] = useState<AdminLookPriceMode>(initialLook.priceMode || "quote");
  const [price, setPrice] = useState(nairaInput(initialLook.priceMinor));
  const [media, setMedia] = useState<AdminMediaRecord[]>(initialMedia);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState<UploadState>({ mode: "idle", progress: 0 });
  const [mediaOpen, setMediaOpen] = useState(false);
  const [library, setLibrary] = useState<AdminMediaRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const markDirty = () => { setDirty(true); if (saveState === "saved") setSaveState("idle"); };

  const primaryMedia = media[0];
  const fallbackPrimary = starterFallbackMedia.find((item) => item.kind === "image") || starterFallbackMedia[0];
  const displayCaption = lookProvenanceLabel(provenance, generated);
  const priceDisplay = useMemo(() => {
    if (priceMode === "hidden") return "Price not shown";
    if (priceMode === "quote") return "Ask for a quote";
    if (!price) return priceMode === "from" ? "From price not set" : "Price not set";
    return priceMode === "from" ? `From ₦${Number(price).toLocaleString("en-NG")}` : `₦${Number(price).toLocaleString("en-NG")}`;
  }, [priceMode, price]);

  const payload = (): Partial<AdminLookRecord> => ({
    id: recordId || initialLook.id,
    sourceStarterId: initialLook.sourceStarterId,
    reference: initialLook.reference,
    slug: initialLook.slug || title,
    title,
    category,
    caption,
    mediaIds: media.map((item) => item.id),
    provenance,
    generated: provenance === "real-work" ? false : generated,
    clientPermission,
    priceMode,
    ...(toMinor(price) !== undefined ? { priceMinor: toMinor(price) } : {}),
    status,
    revision,
  });

  async function syncMediaMetadata() {
    if (!media.length) return true;
    try {
      await Promise.all(media.map((item) => adminFetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alt: item.alt,
          caption: item.caption || "",
          provenance,
          ...(provenance === "real-work" ? {} : { generated }),
          consentConfirmed: provenance === "real-work" ? clientPermission : item.consentConfirmed === true,
          focal: item.focal,
        }),
      }).then((response) => { if (!response.ok) throw new Error("Media details could not be saved."); })));
      setMedia((current) => current.map((item) => ({ ...item, provenance, generated: provenance === "real-work" ? item.generated : generated, consentConfirmed: provenance === "real-work" ? clientPermission : item.consentConfirmed })));
      return true;
    } catch {
      setSaveState("error");
      setFeedback("The look text is still here, but its media details could not be saved. Try again.");
      return false;
    }
  }

  async function saveDraft() {
    if (saveState === "saving") return null;
    setSaveState("saving"); setFeedback(""); setFieldErrors({});
    if (!(await syncMediaMetadata())) return null;
    try {
      const current = payload();
      const creating = !recordId;
      const response = await adminFetch(creating ? "/api/admin/looks" : `/api/admin/looks/${recordId}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? current : { ...current, expectedRevision: revision }),
      });
      const data = await response.json().catch(() => ({})) as { id?: string; revision?: number; message?: string; fieldErrors?: Record<string, string> };
      if (!response.ok) {
        setSaveState(response.status === 409 ? "conflict" : "error");
        setFeedback(data.message || "The draft could not be saved.");
        setFieldErrors(data.fieldErrors || {});
        return null;
      }
      const nextId = data.id || recordId;
      const nextRevision = data.revision || revision;
      setRecordId(nextId); setRevision(nextRevision); setStatus("draft"); setDirty(false); setSaveState("saved"); setFeedback("Saved just now.");
      if (creating && nextId) router.replace(`/admin/gallery/${nextId}`);
      return { id: nextId, revision: nextRevision };
    } catch {
      setSaveState("error"); setFeedback("The draft could not be saved. Check your connection and try again."); return null;
    }
  }

  async function publishLook() {
    const saved = dirty || !recordId ? await saveDraft() : { id: recordId, revision };
    if (!saved?.id) return;
    setFeedback("Publishing…"); setFieldErrors({});
    const response = await adminFetch(`/api/admin/looks/${saved.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: saved.revision }) });
    const data = await response.json().catch(() => ({})) as { revision?: number; message?: string; fieldErrors?: Record<string, string> };
    if (!response.ok) { setFeedback(data.message || "The look could not be published."); setFieldErrors(data.fieldErrors || {}); return; }
    setRevision(data.revision || saved.revision + 1); setStatus("published"); setSaveState("saved"); setFeedback("Your look is live. View it in the gallery."); setDirty(false);
  }

  async function openMediaLibrary() {
    setMediaOpen(true); setLibraryLoading(true);
    try {
      const response = await adminFetch("/api/admin/look-media", { cache: "no-store" });
      const data = await response.json() as { media?: AdminMediaRecord[] };
      setLibrary(data.media || []);
    } finally { setLibraryLoading(false); }
  }

  async function uploadFile(file: File) {
    lastFileRef.current = file;
    const imageTypes = ["image/jpeg", "image/png", "image/webp"];
    const videoTypes = ["video/mp4", "video/webm"];
    const resourceType = videoTypes.includes(file.type) ? "video" : "image";
    if (!imageTypes.includes(file.type) && !videoTypes.includes(file.type)) { setUpload({ mode: "error", progress: 0, message: "Use JPG, PNG, WebP, MP4 or WebM." }); return; }
    const maxBytes = resourceType === "video" ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) { setUpload({ mode: "error", progress: 0, message: resourceType === "video" ? "Videos must be 20 MB or smaller." : "Images must be 8 MB or smaller." }); return; }
    if (resourceType === "video") {
      try { const duration = await readVideoDuration(file); if (!Number.isFinite(duration) || duration > 10.25) { setUpload({ mode: "error", progress: 0, message: "Gallery videos must be 10 seconds or shorter." }); return; } }
      catch { setUpload({ mode: "error", progress: 0, message: "The video could not be read. Try another MP4 or WebM file." }); return; }
    }

    setUpload({ mode: "signing", progress: 0 });
    const signResponse = await adminFetch("/api/admin/look-media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType }) });
    const signed = await signResponse.json().catch(() => ({})) as { uploadUrl?: string; apiKey?: string; params?: Record<string, string | number>; signature?: string; message?: string };
    if (!signResponse.ok || !signed.uploadUrl || !signed.apiKey || !signed.params || !signed.signature) { setUpload({ mode: "error", progress: 0, message: signed.message || "Could not prepare the upload." }); return; }

    const form = new FormData();
    form.append("file", file); form.append("api_key", signed.apiKey); form.append("signature", signed.signature);
    Object.entries(signed.params).forEach(([key, value]) => form.append(key, String(value)));
    setUpload({ mode: "uploading", progress: 1 });
    const cloudinary = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhrRef.current = xhr; xhr.open("POST", signed.uploadUrl as string);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUpload({ mode: "uploading", progress: Math.max(1, Math.round((event.loaded / event.total) * 100)) }); };
      xhr.onerror = () => reject(new Error("Upload failed.")); xhr.onabort = () => reject(new Error("Upload cancelled."));
      xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText) as Record<string, unknown>); } catch { reject(new Error("Upload response was invalid.")); } } else reject(new Error("Upload failed.")); };
      xhr.send(form);
    }).catch((error) => { setUpload({ mode: "error", progress: 0, message: error instanceof Error ? error.message : "Upload failed." }); return null; });
    xhrRef.current = null; if (!cloudinary) return;

    setUpload({ mode: "finalising", progress: 100 });
    const finalize = await adminFetch("/api/admin/look-media/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cloudinary, alt: "", caption: "", provenance, generated: provenance === "real-work" ? false : generated, consentConfirmed: provenance === "real-work" ? clientPermission : false }),
    });
    const result = await finalize.json().catch(() => ({})) as { media?: AdminMediaRecord; message?: string };
    if (!finalize.ok || !result.media) { setUpload({ mode: "error", progress: 0, message: result.message || "The uploaded media could not be saved." }); return; }
    setMedia((current) => [...current, result.media as AdminMediaRecord]); markDirty(); setUpload({ mode: "idle", progress: 0 });
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); event.target.value = ""; };
  const updateMedia = (id: string, patch: Partial<AdminMediaRecord>) => { setMedia((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); markDirty(); };
  const moveMedia = (index: number, direction: -1 | 1) => { setMedia((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); markDirty(); };

  const previewMedia = primaryMedia
    ? { kind: primaryMedia.resourceType as "image" | "video", src: primaryMedia.secureUrl, alt: primaryMedia.alt || title || "Selected gallery media", caption: primaryMedia.caption || displayCaption }
    : fallbackPrimary;

  return (
    <div className="admin-look-editor-content">
      <div className="admin-look-editor-head"><div><div className="eyebrow">KEO HAIRVEN</div><h1>{recordId || initialLook.preview ? "Edit gallery look" : "Add a gallery look"}</h1></div></div>
      <div className="admin-look-editor-grid">
        <div className="admin-look-editor-left">
          <section className="admin-editor-panel">
            <h2>1. Image &amp; story</h2>
            <div className="admin-look-uploadbox">
              <span className="admin-upload-plus" aria-hidden="true">+</span><h3>Choose a photo or short video</h3><p>Show the look clearly, with good light.</p>
              <div className="admin-upload-actions"><button className="button button-outline" type="button" onClick={() => fileInputRef.current?.click()}>Choose media</button><button className="button button-outline" type="button" onClick={() => void openMediaLibrary()}>Media library</button></div>
              <small>JPG/PNG/WebP ≤8 MB · MP4/WebM ≤20 MB and ≤10 seconds</small>
              <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={onFileChange} />
              {upload.mode !== "idle" && <div className="admin-upload-progress" role="status"><div><span style={{ width: `${upload.progress}%` }} /></div><p>{upload.mode === "signing" ? "Preparing upload…" : upload.mode === "uploading" ? `Uploading ${upload.progress}%` : upload.mode === "finalising" ? "Saving media…" : upload.message}</p>{upload.mode === "uploading" && <button type="button" onClick={() => xhrRef.current?.abort()}>Cancel</button>}{upload.mode === "error" && lastFileRef.current && <button type="button" onClick={() => void uploadFile(lastFileRef.current as File)}>Retry</button>}</div>}
            </div>

            {media.length > 0 && <div className="admin-look-selected-media" aria-label="Selected gallery media">{media.map((item, index) => <div className={index === 0 ? "is-primary" : ""} key={item.id}>
              <span className="admin-look-selected-preview">{item.resourceType === "image" ? <Image src={item.secureUrl} alt={item.alt || "Selected gallery media"} fill sizes="100px" style={{ objectFit: "cover" }} /> : <video src={item.secureUrl} muted playsInline preload="metadata" aria-label={item.alt || "Selected gallery video"} />}</span>
              <div><b>{index === 0 ? "Primary" : item.resourceType === "video" ? "Video" : "Photo"}</b><span>{item.alt || "Add a media description below"}</span></div>
              <div className="admin-look-media-order"><button type="button" disabled={index === 0} onClick={() => moveMedia(index, -1)} aria-label="Move media earlier">↑</button><button type="button" disabled={index === media.length - 1} onClick={() => moveMedia(index, 1)} aria-label="Move media later">↓</button><button type="button" onClick={() => { setMedia((current) => current.filter((entry) => entry.id !== item.id)); markDirty(); }} aria-label="Remove media">×</button></div>
            </div>)}</div>}

            <label className="admin-editor-field"><span>Look title</span><input value={title} onChange={(event) => { setTitle(event.target.value.slice(0, 140)); markDirty(); }} placeholder="e.g. Neat knotless braids" />{fieldErrors.title && <small className="is-error">{fieldErrors.title}</small>}</label>
            <div className="admin-editor-field"><span>Category</span><BrandSelect value={category} options={categoryOptions} onChange={(value) => { setCategory(value); markDirty(); }} ariaLabel="Choose gallery category" />{fieldErrors.category && <small className="is-error">{fieldErrors.category}</small>}</div>
            <label className="admin-editor-field"><span>Description</span><textarea value={caption} onChange={(event) => { setCaption(event.target.value.slice(0, 3000)); markDirty(); }} placeholder="Tell customers about this look." rows={5} />{fieldErrors.caption && <small className="is-error">{fieldErrors.caption}</small>}</label>
            {primaryMedia && <><label className="admin-editor-field"><span>Media description</span><input value={primaryMedia.alt || ""} onChange={(event) => updateMedia(primaryMedia.id, { alt: event.target.value.slice(0, 300) })} placeholder="Describe what is shown for screen readers" />{fieldErrors.mediaAlt && <small className="is-error">{fieldErrors.mediaAlt}</small>}</label><label className="admin-editor-field"><span>Media caption <small>(optional)</small></span><input value={primaryMedia.caption || ""} onChange={(event) => updateMedia(primaryMedia.id, { caption: event.target.value.slice(0, 500) })} placeholder={displayCaption} /></label></>}
            {fieldErrors.mediaIds && <div className="admin-editor-inline-error">{fieldErrors.mediaIds}</div>}
          </section>

          <section className="admin-editor-panel">
            <h2>2. Permission &amp; label</h2>
            <div className="admin-editor-field"><span>Image type</span><BrandSelect value={provenance} options={provenanceOptions} onChange={(value) => { setProvenance(value); if (value === "real-work") setGenerated(false); markDirty(); }} ariaLabel="Choose gallery provenance" />{fieldErrors.provenance && <small className="is-error">{fieldErrors.provenance}</small>}</div>
            <label className={`admin-look-check-row${provenance !== "real-work" ? " is-muted" : ""}`}><span><b>I have permission to publish this client photo or video</b><small>{provenance === "real-work" ? "Required before identifiable client work can be published." : "Only required when this is KEO Hairven’s real client work."}</small></span><input type="checkbox" checked={clientPermission} disabled={provenance !== "real-work"} onChange={(event) => { setClientPermission(event.target.checked); markDirty(); }} /></label>
            {fieldErrors.clientPermission && <div className="admin-editor-inline-error">{fieldErrors.clientPermission}</div>}
            <div className="admin-editor-two"><div className="admin-editor-field"><span>Price display</span><BrandSelect value={priceMode} options={priceOptions} onChange={(value) => { setPriceMode(value); markDirty(); }} ariaLabel="Choose gallery price display" /></div>{(priceMode === "fixed" || priceMode === "from") && <label className="admin-editor-field"><span>{priceMode === "from" ? "Starting amount (₦)" : "Amount (₦)"}</span><input inputMode="decimal" value={price} onChange={(event) => { setPrice(event.target.value.replace(/[^0-9.]/g, "")); markDirty(); }} />{fieldErrors.priceMinor && <small className="is-error">{fieldErrors.priceMinor}</small>}</label>}</div>
          </section>
        </div>

        <aside className="admin-look-editor-right">
          <section className="admin-editor-panel" id="look-preview-card"><h2>A good gallery photo</h2><figure className="admin-look-guide-image"><Image src="/assets/campaign/braids-inspiration.webp" alt="Example of a clearly framed braided hairstyle" fill sizes="340px" style={{ objectFit: "cover", objectPosition: "50% 45%" }} /></figure><p>Keep the hairstyle or nails clearly in frame. Use a clear title. Avoid private client details.</p><div className="admin-gallery-notice">A real client image needs permission before publishing.</div></section>
          <section className="admin-editor-panel admin-look-live-preview"><h2>Current preview</h2>{previewMedia ? <figure className="admin-look-preview-media">{previewMedia.kind === "video" ? <video src={previewMedia.src} muted autoPlay loop playsInline preload="metadata" aria-label={previewMedia.alt} /> : <Image src={previewMedia.src} alt={previewMedia.alt} fill sizes="340px" style={{ objectFit: "cover" }} />}<figcaption>{previewMedia.caption || displayCaption}</figcaption></figure> : <div className="admin-look-preview-empty">Choose media to preview the look.</div>}<h3>{title || "Untitled look"}</h3><p>{category ? categoryLabel(category) : "Choose a category"} · {displayCaption}</p><strong>{priceDisplay}</strong></section>
          <section className="admin-editor-panel admin-publishing-panel"><h2>Publishing</h2><div className="admin-publish-row"><div><b>Save as draft</b><p>Keep working privately.</p></div><span>✓</span></div><div className="admin-publish-row"><div><b>Publish after review</b><p>Review the details before making this look public.</p></div><span>{status === "published" ? "✓" : "○"}</span></div><button className="button button-primary" type="button" onClick={() => void publishLook()}>Publish look <span aria-hidden="true">↗</span></button></section>
        </aside>
      </div>

      <div className="admin-product-savebar"><span>{saveState === "saving" ? "Saving…" : saveState === "saved" ? feedback : saveState === "conflict" ? "Conflict — refresh before continuing" : dirty ? "Unsaved changes" : feedback || `${recordId ? "Look" : "New look"} · ${status}`}</span><button className="button button-outline" type="button" disabled={saveState === "saving"} onClick={() => void saveDraft()}>Save draft</button><button className="button button-primary" type="button" onClick={() => document.getElementById("look-preview-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Preview <span aria-hidden="true">→</span></button></div>
      {(saveState === "error" || saveState === "conflict" || (feedback && !["Saved just now.", "Your look is live. View it in the gallery."].includes(feedback))) && <div className="admin-editor-feedback" role="alert">{feedback}{saveState === "conflict" && <button type="button" onClick={() => window.location.reload()}>Refresh editor</button>}</div>}

      {mediaOpen && <ModalDialog open onClose={() => setMediaOpen(false)} label="Choose gallery media" className="studio-media-dialog"><section className="admin-media-picker"><div className="admin-media-picker-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h2>Choose media</h2></div><button type="button" aria-label="Close media library" onClick={() => setMediaOpen(false)}>×</button></div>{libraryLoading ? <p>Loading media…</p> : library.length ? <div className="admin-media-picker-grid">{library.map((item) => <button type="button" key={item.id} onClick={() => { setMedia((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]); setMediaOpen(false); markDirty(); }}><span>{item.resourceType === "image" ? <Image src={item.secureUrl} alt={item.alt || "Media library image"} fill sizes="140px" style={{ objectFit: "cover" }} /> : <video src={item.secureUrl} muted playsInline preload="metadata" aria-label={item.alt || "Media library video"} />}</span><small>{item.alt || (item.resourceType === "video" ? "Video · add a description" : "No image description yet")}</small></button>)}</div> : <div className="admin-media-picker-empty"><h3>No uploaded media yet.</h3><p>Upload the first gallery photo or short video from this editor.</p></div>}</section></ModalDialog>}
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  );
}

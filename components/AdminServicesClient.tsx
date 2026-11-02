"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandSelect, type BrandSelectOption } from "@/components/BrandSelect";
import { adminFetch } from "@/lib/admin-client";
import type { AdminMediaRecord } from "@/lib/admin-product-shared";
import type { AdminServiceListItem, AdminServiceRecord } from "@/lib/admin-service-shared";
import type { ServiceMedia, ServicePriceMode } from "@/lib/services";

const priceOptions: readonly BrandSelectOption<ServicePriceMode>[] = [
  { value: "quote", label: "Ask for a quote" },
  { value: "fixed", label: "Fixed price" },
  { value: "from", label: "From price" },
  { value: "range", label: "Price range" },
  { value: "hidden", label: "Do not show a price" },
];

type UploadState = { mode: "idle" | "signing" | "uploading" | "finalising" | "error"; progress: number; message?: string };

type Props = {
  initialServices: AdminServiceListItem[];
  initialService: AdminServiceRecord;
  initialMedia: AdminMediaRecord[];
  starterFallback?: ServiceMedia;
  isNew: boolean;
};

function nairaInput(minor?: number) { return Number.isInteger(minor) ? String((minor as number) / 100) : ""; }
function toMinor(value: string) { const number = Number(value.replace(/,/g, "")); return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : undefined; }

function servicePriceLabel(service: Pick<AdminServiceRecord, "priceMode" | "priceMinor" | "minPriceMinor" | "maxPriceMinor">) {
  const format = (minor: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(minor / 100);
  if (service.priceMode === "fixed" && Number.isInteger(service.priceMinor)) return format(service.priceMinor as number);
  if (service.priceMode === "from" && Number.isInteger(service.minPriceMinor)) return `From ${format(service.minPriceMinor as number)}`;
  if (service.priceMode === "range" && Number.isInteger(service.minPriceMinor) && Number.isInteger(service.maxPriceMinor)) return `${format(service.minPriceMinor as number)} – ${format(service.maxPriceMinor as number)}`;
  if (service.priceMode === "hidden") return "Price hidden";
  return "Price on enquiry";
}

function statusLabel(service: AdminServiceListItem) { return service.preview ? "draft" : service.status; }

export function AdminServicesClient({ initialServices, initialService, initialMedia, starterFallback, isNew }: Props) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [recordId, setRecordId] = useState(isNew ? "" : initialService.id);
  const [revision, setRevision] = useState(isNew ? 0 : initialService.revision);
  const [status, setStatus] = useState(initialService.preview ? "draft" : initialService.status);
  const [title, setTitle] = useState(initialService.title || "");
  const [slug, setSlug] = useState(initialService.slug || "service");
  const [description, setDescription] = useState(initialService.description || "");
  const [preparation, setPreparation] = useState(initialService.preparation || "");
  const [priceMode, setPriceMode] = useState<ServicePriceMode>(initialService.priceMode || "quote");
  const [price, setPrice] = useState(nairaInput(initialService.priceMinor));
  const [minPrice, setMinPrice] = useState(nairaInput(initialService.minPriceMinor));
  const [maxPrice, setMaxPrice] = useState(nairaInput(initialService.maxPriceMinor));
  const [media, setMedia] = useState<AdminMediaRecord[]>(initialMedia);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [library, setLibrary] = useState<AdminMediaRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploadPermission, setUploadPermission] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ mode: "idle", progress: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const markDirty = () => { setDirty(true); if (saveState === "saved") setSaveState("idle"); };
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selectedMedia = media[0];
  const previewSrc = selectedMedia?.secureUrl || starterFallback?.src;
  const previewAlt = selectedMedia?.alt || starterFallback?.alt || title || "Service preview";
  const computedPrice = useMemo(() => servicePriceLabel({
    priceMode,
    priceMinor: toMinor(price),
    minPriceMinor: toMinor(minPrice),
    maxPriceMinor: toMinor(maxPrice),
  }), [priceMode, price, minPrice, maxPrice]);

  function payload() {
    return {
      ...(initialService.sourceStarterId ? { sourceStarterId: initialService.sourceStarterId } : {}),
      title,
      slug,
      description,
      preparation,
      priceMode,
      priceMinor: toMinor(price),
      minPriceMinor: toMinor(minPrice),
      maxPriceMinor: toMinor(maxPrice),
      mediaIds: media.map((item) => item.id),
    };
  }

  async function refreshList() {
    const response = await adminFetch("/api/admin/services", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { services?: AdminServiceListItem[] };
    if (data.services) setServices(data.services);
  }

  async function syncMedia() {
    try {
      await Promise.all(media.map((item) => adminFetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: item.alt, caption: item.caption || "", consentConfirmed: item.consentConfirmed === true, focal: item.focal }),
      }).then((response) => { if (!response.ok) throw new Error("media"); })));
      return true;
    } catch {
      setFeedback("The service text is still here, but its media details could not be saved. Try again.");
      setSaveState("error");
      return false;
    }
  }

  async function saveDraft() {
    if (saveState === "saving") return null;
    setSaveState("saving"); setFeedback(""); setFieldErrors({});
    if (!(await syncMedia())) return null;
    try {
      const creating = !recordId;
      const response = await adminFetch(creating ? "/api/admin/services" : `/api/admin/services/${recordId}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? payload() : { ...payload(), expectedRevision: revision }),
      });
      const data = await response.json().catch(() => ({})) as { id?: string; revision?: number; slug?: string; message?: string; fieldErrors?: Record<string, string> };
      if (!response.ok) {
        setSaveState(response.status === 409 ? "conflict" : "error");
        setFeedback(data.message || "The service draft could not be saved.");
        setFieldErrors(data.fieldErrors || {});
        return null;
      }
      const id = data.id || recordId; const nextRevision = data.revision || revision;
      setRecordId(id); setRevision(nextRevision); setStatus("draft"); setDirty(false); setSaveState("saved"); setFeedback("Saved just now.");
      if (data.slug) setSlug(data.slug);
      await refreshList();
      if (creating && id) router.replace(`/admin/services?edit=${encodeURIComponent(id)}`);
      return { id, revision: nextRevision };
    } catch {
      setSaveState("error"); setFeedback("The service draft could not be saved. Check your connection and try again."); return null;
    }
  }

  async function publishService() {
    const saved = dirty || !recordId ? await saveDraft() : { id: recordId, revision };
    if (!saved?.id) return;
    setFeedback("Publishing…"); setFieldErrors({});
    const response = await adminFetch(`/api/admin/services/${saved.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: saved.revision }) });
    const data = await response.json().catch(() => ({})) as { revision?: number; message?: string; fieldErrors?: Record<string, string> };
    if (!response.ok) { setFeedback(data.message || "The service could not be published."); setFieldErrors(data.fieldErrors || {}); return; }
    setRevision(data.revision || saved.revision + 1); setStatus("published"); setSaveState("saved"); setDirty(false); setFeedback("Service published. View it on your website."); await refreshList();
  }

  async function lifecycle(service: AdminServiceListItem, action: "duplicate" | "unpublish" | "restore" | "trash") {
    if (service.preview) return;
    setBusyId(service.id); setMenuId(null); setFeedback("");
    const url = action === "trash" ? `/api/admin/services/${service.id}` : `/api/admin/services/${service.id}/${action}`;
    const response = await adminFetch(url, { method: action === "trash" ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: service.revision }) });
    const data = await response.json().catch(() => ({})) as { message?: string; id?: string };
    if (!response.ok) setFeedback(data.message || "That service action could not be completed.");
    else {
      setFeedback(action === "duplicate" ? "Service duplicated as a draft." : action === "restore" ? "Service restored as a draft." : action === "unpublish" ? "Service hidden from visitors." : "Service moved to Trash.");
      await refreshList();
      if (action === "duplicate" && data.id) router.push(`/admin/services?edit=${encodeURIComponent(data.id)}`);
      else router.refresh();
    }
    setBusyId(null);
  }

  async function openMediaLibrary() {
    setMediaOpen(true); setLibraryLoading(true);
    try {
      const response = await adminFetch("/api/admin/service-media", { cache: "no-store" });
      const data = await response.json() as { media?: AdminMediaRecord[] };
      setLibrary(data.media || []);
    } finally { setLibraryLoading(false); }
  }

  async function uploadFile(file: File) {
    lastFileRef.current = file;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setUpload({ mode: "error", progress: 0, message: "Use a JPG, PNG or WebP image." }); return; }
    if (file.size > 8 * 1024 * 1024) { setUpload({ mode: "error", progress: 0, message: "Images must be 8 MB or smaller." }); return; }
    if (!uploadPermission) { setUpload({ mode: "error", progress: 0, message: "Confirm you have the right to use this image publicly before uploading." }); return; }
    setUpload({ mode: "signing", progress: 0 });
    const signResponse = await adminFetch("/api/admin/service-media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const signed = await signResponse.json().catch(() => ({})) as { uploadUrl?: string; apiKey?: string; params?: Record<string, string | number>; signature?: string; message?: string };
    if (!signResponse.ok || !signed.uploadUrl || !signed.apiKey || !signed.params || !signed.signature) { setUpload({ mode: "error", progress: 0, message: signed.message || "Could not prepare the upload." }); return; }
    const form = new FormData(); form.append("file", file); form.append("api_key", signed.apiKey); form.append("signature", signed.signature); Object.entries(signed.params).forEach(([key, value]) => form.append(key, String(value)));
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
    const finalize = await adminFetch("/api/admin/service-media/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cloudinary, alt: "", caption: "", consentConfirmed: uploadPermission }) });
    const result = await finalize.json().catch(() => ({})) as { media?: AdminMediaRecord; message?: string };
    if (!finalize.ok || !result.media) { setUpload({ mode: "error", progress: 0, message: result.message || "The uploaded image could not be saved." }); return; }
    setMedia([result.media]); markDirty(); setUpload({ mode: "idle", progress: 0 });
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); event.target.value = ""; };

  return (
    <div className="admin-services-content">
      <div className="admin-services-head"><div><div className="eyebrow">KEO HAIRVEN</div><h1>Your services</h1></div></div>
      {feedback && <div className="admin-services-feedback" role="status">{feedback}</div>}

      <div className="admin-services-cols">
        <section className="admin-service-list-panel">
          <h2>Service list</h2>
          <div className="admin-service-list">
            {services.filter(service => service.status !== "trashed").map((service) => (
              <div className="admin-service-list-row" key={service.id}>
                <div><b>{service.title}</b><p>{servicePriceLabel(service)}</p><small>{statusLabel(service)}</small></div>
                <div className="admin-service-row-actions">
                  <Link href={service.preview ? `/admin/services?edit=${encodeURIComponent(service.id)}` : `/admin/services?edit=${encodeURIComponent(service.id)}`}>Edit ↗</Link>
                  {!service.preview && <div className="admin-product-menu-wrap"><button type="button" aria-label={`More actions for ${service.title}`} onClick={() => setMenuId((current) => current === service.id ? null : service.id)}>•••</button>{menuId === service.id && <div className="admin-product-menu"><button type="button" disabled={busyId === service.id} onClick={() => void lifecycle(service, "duplicate")}>Duplicate to draft</button>{service.status === "published" && <button type="button" disabled={busyId === service.id} onClick={() => void lifecycle(service, "unpublish")}>Unpublish</button>}{service.status === "trashed" ? <button type="button" disabled={busyId === service.id} onClick={() => void lifecycle(service, "restore")}>Restore as draft</button> : <button type="button" className="is-danger" disabled={busyId === service.id} onClick={() => void lifecycle(service, "trash")}>Move to Trash</button>}</div>}</div>}
                </div>
              </div>
            ))}
          </div>
          <Link className="button button-outline admin-service-add" href="/admin/services?new=1">+ Add service</Link>
        </section>

        <section className="admin-service-editor-panel">
          <div className="admin-service-editor-title"><div><h2>{recordId || initialService.preview ? `Edit ${title || "service"}` : "Add service"}</h2><p>{status === "published" ? "Published" : "Draft"} · revision {revision || "new"}</p></div>{recordId && <a href={`/services/${slug}`} target="_blank" rel="noopener noreferrer">View page ↗</a>}</div>

          <label className="admin-editor-field"><span>Service title</span><input value={title} maxLength={140} onChange={(event) => { setTitle(event.target.value); if (!recordId) setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); markDirty(); }} />{fieldErrors.title && <small className="admin-field-error">{fieldErrors.title}</small>}</label>
          <label className="admin-editor-field"><span>Public link slug</span><input value={slug} maxLength={80} onChange={(event) => { setSlug(event.target.value); markDirty(); }} /></label>
          <label className="admin-editor-field"><span>Short description</span><textarea value={description} maxLength={3000} rows={5} onChange={(event) => { setDescription(event.target.value); markDirty(); }} placeholder="Describe what customers can ask you about without inventing duration or inclusions." />{fieldErrors.description && <small className="admin-field-error">{fieldErrors.description}</small>}</label>
          <div className="admin-editor-field"><span>Price display</span><BrandSelect value={priceMode} options={priceOptions} onChange={(value) => { setPriceMode(value); markDirty(); }} ariaLabel="Choose service price display" /></div>
          {priceMode === "fixed" && <label className="admin-editor-field"><span>Price (₦)</span><input inputMode="decimal" value={price} onChange={(event) => { setPrice(event.target.value); markDirty(); }} placeholder="45000" />{fieldErrors.priceMinor && <small className="admin-field-error">{fieldErrors.priceMinor}</small>}</label>}
          {priceMode === "from" && <label className="admin-editor-field"><span>Starting price (₦)</span><input inputMode="decimal" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); markDirty(); }} placeholder="45000" />{fieldErrors.minPriceMinor && <small className="admin-field-error">{fieldErrors.minPriceMinor}</small>}</label>}
          {priceMode === "range" && <div className="admin-editor-two"><label className="admin-editor-field"><span>Minimum (₦)</span><input inputMode="decimal" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); markDirty(); }} /></label><label className="admin-editor-field"><span>Maximum (₦)</span><input inputMode="decimal" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); markDirty(); }} /></label>{fieldErrors.range && <small className="admin-field-error">{fieldErrors.range}</small>}</div>}
          <label className="admin-editor-field"><span>Preparation notes</span><textarea value={preparation} maxLength={1600} rows={4} onChange={(event) => { setPreparation(event.target.value); markDirty(); }} placeholder="Add only preparation instructions you actually use." /></label>

          <div className="admin-service-media-section">
            <div className="admin-editor-section-head"><div><h2>Service image</h2><p>Use a clear image that represents this service.</p></div></div>
            {previewSrc && <div className="admin-service-selected-media"><div className="admin-service-selected-preview">{selectedMedia ? <Image src={selectedMedia.secureUrl} alt={selectedMedia.alt || previewAlt} fill sizes="120px" style={{ objectFit: "cover" }} /> : starterFallback ? <Image src={starterFallback.src} alt={starterFallback.alt} fill sizes="120px" style={{ objectFit: "cover" }} /> : null}</div><div>{selectedMedia ? <><label className="admin-editor-field"><span>Image description</span><input value={selectedMedia.alt || ""} maxLength={300} onChange={(event) => { setMedia([{ ...selectedMedia, alt: event.target.value }]); markDirty(); }} placeholder="Describe the image for accessibility" /></label><button type="button" className="admin-service-remove-media" onClick={() => { setMedia([]); markDirty(); }}>Remove selected image</button></> : <p>Using the current website image.</p>}</div></div>}
            <div className="admin-upload-actions"><button type="button" className="button button-outline" onClick={() => fileInputRef.current?.click()}>Upload image</button><button type="button" className="button button-outline" onClick={() => void openMediaLibrary()}>Media library</button></div>
            <label className="admin-look-check-row"><input type="checkbox" checked={uploadPermission} onChange={(event) => setUploadPermission(event.target.checked)} /><span>I confirm I have the right to use any image I upload publicly.</span></label>
            <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
            {upload.mode !== "idle" && <div className="admin-upload-progress" role="status"><div><span style={{ width: `${upload.progress}%` }} /></div><p>{upload.mode === "signing" ? "Preparing upload…" : upload.mode === "uploading" ? `Uploading ${upload.progress}%` : upload.mode === "finalising" ? "Saving image…" : upload.message}</p>{upload.mode === "uploading" && <button type="button" onClick={() => xhrRef.current?.abort()}>Cancel</button>}{upload.mode === "error" && lastFileRef.current && <button type="button" onClick={() => void uploadFile(lastFileRef.current as File)}>Retry</button>}</div>}
            {fieldErrors.mediaIds && <small className="admin-field-error">{fieldErrors.mediaIds}</small>}{fieldErrors.mediaAlt && <small className="admin-field-error">{fieldErrors.mediaAlt}</small>}{fieldErrors.mediaPermission && <small className="admin-field-error">{fieldErrors.mediaPermission}</small>}
          </div>

          <div className="admin-service-savebar"><span>{dirty ? "Unsaved changes" : saveState === "saved" ? "Saved" : status === "published" ? "Published" : "Draft"}</span><button type="button" className="button button-outline" onClick={() => setPreviewOpen(true)}>Preview</button><button type="button" className="button button-outline" disabled={saveState === "saving"} onClick={() => void saveDraft()}>{saveState === "saving" ? "Saving…" : "Save draft"}</button><button type="button" className="button button-primary" disabled={saveState === "saving"} onClick={() => void publishService()}>Publish</button></div>
        </section>
      </div>

      {previewOpen && <div className="admin-media-picker-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}><section className="admin-service-preview-modal" role="dialog" aria-modal="true" aria-label="Service preview"><div className="admin-media-picker-head"><div><div className="eyebrow">DRAFT PREVIEW</div><h2>{title || "Untitled service"}</h2></div><button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}>×</button></div><div className="admin-service-preview-card">{previewSrc ? <div className="admin-service-preview-image"><Image src={previewSrc} alt={previewAlt} fill sizes="500px" style={{ objectFit: "cover" }} /></div> : <div className="admin-service-preview-empty">Add a service image</div>}<div><div className="eyebrow">SERVICE</div><h3>{title || "Untitled service"}</h3><p>{description || "Add a customer-facing description."}</p><strong>{computedPrice}</strong>{preparation && <div className="admin-service-preview-prep"><b>Before you visit</b><p>{preparation}</p></div>}</div></div></section></div>}

      {mediaOpen && <div className="admin-media-picker-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMediaOpen(false); }}><section className="admin-media-picker" role="dialog" aria-modal="true" aria-label="Choose service image"><div className="admin-media-picker-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h2>Choose an image</h2></div><button type="button" aria-label="Close media library" onClick={() => setMediaOpen(false)}>×</button></div>{libraryLoading ? <p>Loading media…</p> : library.length ? <div className="admin-media-picker-grid">{library.map((item) => <button type="button" key={item.id} onClick={() => { setMedia([item]); setMediaOpen(false); markDirty(); }}><span><Image src={item.secureUrl} alt={item.alt || "Media library image"} fill sizes="140px" style={{ objectFit: "cover" }} /></span><small>{item.alt || "No image description yet"}</small></button>)}</div> : <div className="admin-media-picker-empty"><h3>No reusable images yet.</h3><p>Upload a service image from this editor.</p></div>}</section></div>}
    </div>
  );
}

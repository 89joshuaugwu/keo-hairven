"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useMemo, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import type { AdminLibraryMedia, AdminMediaProvenance } from "@/lib/admin-media-shared";
import { BrandSelect } from "@/components/BrandSelect";

type Role = "owner" | "editor";
type Filter = "all" | "images" | "videos" | "real-work" | "campaign" | "products";
type Sort = "recent" | "name" | "used";
type UploadState = { mode: "idle" | "signing" | "uploading" | "finalising" | "error"; progress: number; message?: string };
type UploadDraft = {
  file: File | null;
  alt: string;
  caption: string;
  provenance: AdminMediaProvenance;
  generated: boolean;
  consentConfirmed: boolean;
  actualItem: boolean;
};

const filters = [
  { value: "all", label: "All media" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
  { value: "real-work", label: "KEO Hairven’s work" },
  { value: "campaign", label: "Campaign / inspiration" },
  { value: "products", label: "Product media" },
] as const;
const sorts = [
  { value: "recent", label: "Recently added" },
  { value: "name", label: "Name A–Z" },
  { value: "used", label: "Most used" },
] as const;
const provenances = [
  { value: "inspiration", label: "Style inspiration" },
  { value: "campaign", label: "Campaign / inspiration" },
  { value: "real-work", label: "KEO Hairven’s real work" },
  { value: "actual-product", label: "Actual product photo" },
  { value: "service-media", label: "Service media" },
  { value: "business-evidence", label: "Brand / business evidence" },
] as const;

function provenanceLabel(item: AdminLibraryMedia) {
  if (item.provenance === "real-work") return "Client work";
  if (item.provenance === "actual-product") return "Actual product";
  if (item.provenance === "service-media") return "Service media";
  if (item.provenance === "business-evidence") return "Brand / business evidence";
  return "Website / gallery media";
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Site media";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateFile(file: File) {
  const image = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const video = ["video/mp4", "video/webm"].includes(file.type);
  if (!image && !video) return "Use JPG, PNG, WebP, MP4 or WebM.";
  if (image && file.size > 8 * 1024 * 1024) return "Images must be 8 MB or smaller.";
  if (video && file.size > 20 * 1024 * 1024) return "Videos must be 20 MB or smaller.";
  return "";
}

async function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); resolve(duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The video could not be read.")); };
    video.src = url;
  });
}

function MediaPreview({ item, focalEditor, onFocal }: { item: AdminLibraryMedia; focalEditor?: boolean; onFocal?: (x: number, y: number) => void }) {
  if (item.resourceType === "video") return <video src={item.secureUrl} muted playsInline controls={Boolean(focalEditor)} preload="metadata" aria-label={item.alt || item.label} />;
  return (
    <div className={`admin-library-image-wrap${focalEditor ? " is-focal-editor" : ""}`} onClick={focalEditor && onFocal ? (event) => {
      const box = event.currentTarget.getBoundingClientRect();
      onFocal(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)));
    } : undefined}>
      <Image src={item.secureUrl} alt={item.alt || item.label} fill sizes="(max-width: 700px) 100vw, 33vw" style={{ objectFit: "cover", objectPosition: `${item.focal.x * 100}% ${item.focal.y * 100}%` }} />
      {focalEditor && <span className="admin-focal-dot" style={{ left: `${item.focal.x * 100}%`, top: `${item.focal.y * 100}%` }} aria-hidden="true" />}
    </div>
  );
}

export function AdminMediaLibraryClient({ initialMedia, role }: { initialMedia: AdminLibraryMedia[]; role: Role }) {
  const [media, setMedia] = useState(initialMedia);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminLibraryMedia | null>(null);
  const [detailsDraft, setDetailsDraft] = useState<AdminLibraryMedia | null>(null);
  const [feedback, setFeedback] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({ file: null, alt: "", caption: "", provenance: "inspiration", generated: false, consentConfirmed: false, actualItem: false });
  const [upload, setUpload] = useState<UploadState>({ mode: "idle", progress: 0 });
  const [replaceTarget, setReplaceTarget] = useState<AdminLibraryMedia | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pageSize = 24;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = media.filter((item) => {
      if (item.status === "trashed") return false;
      if (filter === "images" && item.resourceType !== "image") return false;
      if (filter === "videos" && item.resourceType !== "video") return false;
      if (filter === "real-work" && item.provenance !== "real-work") return false;
      if (filter === "campaign" && !["campaign", "inspiration"].includes(item.provenance)) return false;
      if (filter === "products" && item.provenance !== "actual-product") return false;
      if (!query) return true;
      return [item.label, item.alt, item.caption, item.provenance, item.format].some((value) => String(value || "").toLowerCase().includes(query));
    });
    return [...result].sort((a, b) => {
      if (sort === "name") return a.label.localeCompare(b.label);
      if (sort === "used") return b.references.length - a.references.length || a.label.localeCompare(b.label);
      if (a.starter !== b.starter) return a.starter ? 1 : -1;
      const aTime = typeof a.createdAt === "number" ? a.createdAt : typeof a.updatedAt === "number" ? a.updatedAt : 0;
      const bTime = typeof b.createdAt === "number" ? b.createdAt : typeof b.updatedAt === "number" ? b.updatedAt : 0;
      return bTime - aTime || b.revision - a.revision || a.label.localeCompare(b.label);
    });
  }, [media, search, filter, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);

  function refreshPageState(nextFilter?: Filter) { setPage(1); if (nextFilter) setFilter(nextFilter); }
  function openDetails(item: AdminLibraryMedia) { setSelected(item); setDetailsDraft({ ...item, focal: { ...item.focal }, references: [...item.references] }); setFeedback(""); }
  function closeDetails() { setSelected(null); setDetailsDraft(null); }

  async function refreshLibrary() {
    const response = await adminFetch("/api/admin/media?library=1", { cache: "no-store" });
    const data = await response.json().catch(() => ({})) as { media?: AdminLibraryMedia[] };
    if (response.ok && data.media) setMedia(data.media);
  }

  async function saveDetails() {
    if (!selected || !detailsDraft || selected.starter) return;
    setFeedback("Saving media details…");
    const response = await adminFetch(`/api/admin/media/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedRevision: selected.revision,
        alt: detailsDraft.alt,
        caption: detailsDraft.caption,
        focal: detailsDraft.focal,
        provenance: detailsDraft.provenance,
        generated: detailsDraft.generated,
        consentConfirmed: detailsDraft.consentConfirmed,
        actualItem: detailsDraft.actualItem,
      }),
    });
    const data = await response.json().catch(() => ({})) as { media?: AdminLibraryMedia; message?: string };
    if (!response.ok || !data.media) { setFeedback(data.message || "Media details could not be saved."); return; }
    await refreshLibrary();
    setSelected({ ...data.media, references: selected.references });
    setDetailsDraft({ ...data.media, references: selected.references });
    setFeedback("Media details saved.");
  }

  async function uploadFile(file: File, replacing?: AdminLibraryMedia) {
    const validation = validateFile(file);
    if (validation) { setUpload({ mode: "error", progress: 0, message: validation }); return; }
    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    if (replacing && replacing.resourceType !== resourceType) { setUpload({ mode: "error", progress: 0, message: `Replace this ${replacing.resourceType} with another ${replacing.resourceType}.` }); return; }
    if (resourceType === "video") {
      try { const duration = await readVideoDuration(file); if (!Number.isFinite(duration) || duration > 10.25) { setUpload({ mode: "error", progress: 0, message: "Videos must be 10 seconds or shorter." }); return; } }
      catch { setUpload({ mode: "error", progress: 0, message: "The video could not be read. Try another MP4 or WebM." }); return; }
    }
    setUpload({ mode: "signing", progress: 0 });
    const signResponse = await adminFetch("/api/admin/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "library", resourceType }) });
    const signed = await signResponse.json().catch(() => ({})) as { uploadUrl?: string; apiKey?: string; signature?: string; params?: Record<string, string | number>; message?: string };
    if (!signResponse.ok || !signed.uploadUrl || !signed.apiKey || !signed.signature || !signed.params) { setUpload({ mode: "error", progress: 0, message: signed.message || "Could not prepare the upload." }); return; }
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
    const metadata = replacing ? {
      replaceId: replacing.id,
      expectedRevision: replacing.revision,
      alt: replacing.alt,
      caption: replacing.caption,
      provenance: replacing.provenance,
      generated: replacing.generated,
      consentConfirmed: replacing.consentConfirmed,
      actualItem: replacing.actualItem,
    } : {
      alt: uploadDraft.alt,
      caption: uploadDraft.caption,
      provenance: uploadDraft.provenance,
      generated: uploadDraft.provenance === "real-work" ? false : uploadDraft.generated,
      consentConfirmed: uploadDraft.consentConfirmed,
      actualItem: uploadDraft.actualItem || uploadDraft.provenance === "actual-product",
    };
    const finalize = await adminFetch("/api/admin/media/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cloudinary, ...metadata }) });
    const result = await finalize.json().catch(() => ({})) as { media?: AdminLibraryMedia; message?: string };
    if (!finalize.ok || !result.media) { setUpload({ mode: "error", progress: 0, message: result.message || "The uploaded media could not be saved." }); return; }
    setUpload({ mode: "idle", progress: 0 }); setUploadOpen(false); setReplaceTarget(null);
    setUploadDraft({ file: null, alt: "", caption: "", provenance: "inspiration", generated: false, consentConfirmed: false, actualItem: false });
    await refreshLibrary();
    setFeedback(replacing ? "Media replaced without changing its references." : "Media uploaded to your library.");
  }

  async function moveToTrash(item: AdminLibraryMedia) {
    if (item.starter) { setFeedback("This current-site asset can be replaced from the page or editor where it is used."); return; }
    setFeedback("Checking where this media is used…");
    const response = await adminFetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({})) as { message?: string; references?: AdminLibraryMedia["references"] };
    if (!response.ok) {
      if (data.references?.length) { openDetails({ ...item, references: data.references }); setFeedback(data.message || "This media is still in use."); }
      else setFeedback(data.message || "Media could not be moved to Trash.");
      return;
    }
    await refreshLibrary(); setFeedback("Media moved to Trash.");
  }

  async function restore(item: AdminLibraryMedia) {
    const response = await adminFetch(`/api/admin/media/${item.id}/restore`, { method: "POST" });
    const data = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) { setFeedback(data.message || "Media could not be restored."); return; }
    await refreshLibrary(); setFeedback("Media restored.");
  }

  function onUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setUploadDraft((current) => ({ ...current, file, alt: current.alt || file?.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "" }));
    event.target.value = "";
  }
  function onReplaceFileChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file && replaceTarget) void uploadFile(file, replaceTarget); event.target.value = ""; }
  function openReplace(item: AdminLibraryMedia) { if (item.starter) { setFeedback("Upload a new asset and select it in the page or editor where this media is used."); return; } setReplaceTarget(item); setUpload({ mode: "idle", progress: 0 }); setTimeout(() => replaceInputRef.current?.click(), 0); }

  return (
    <main className="admin-media-content">
      <div className="admin-media-head">
        <div><div className="eyebrow">KEO HAIRVEN</div><h1>Your photo &amp; video library</h1></div>
        <button className="button button-primary" type="button" onClick={() => { setUploadOpen(true); setFeedback(""); }}>+ Upload media</button>
      </div>

      {feedback && <div className="admin-media-feedback" role="status">{feedback}</div>}

      <div className="admin-media-toolbar">
        <label className="admin-media-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search media" aria-label="Search media" /></label>
        <BrandSelect value={filter} options={filters} onChange={(value) => refreshPageState(value)} ariaLabel="Filter media" />
        <BrandSelect value={sort} options={sorts} onChange={(value) => { setSort(value); setPage(1); }} ariaLabel="Sort media" />
      </div>

      {visible.length ? (
        <div className="admin-media-grid">
          {visible.map((item) => (
            <article className={`admin-library-card${item.status === "trashed" ? " is-trashed" : ""}`} key={item.id}>
              <div className="admin-library-card-media"><MediaPreview item={item} />{item.resourceType === "video" && <span className="admin-media-kind">VIDEO</span>}{item.starter && <span className="admin-media-bundled">CURRENT SITE</span>}</div>
              <div className="admin-library-card-body">
                <b>{item.label}</b>
                <p>{provenanceLabel(item)}</p>
                <div className="admin-library-use-count">Used on {item.references.length} item{item.references.length === 1 ? "" : "s"}</div>
                <div className="admin-library-card-actions">
                  <button type="button" onClick={() => openDetails(item)}>Details</button>
                  {item.status === "active" ? <>
                    <button type="button" disabled={item.starter} onClick={() => openReplace(item)}>Replace</button>
                    <button type="button" disabled={item.starter} onClick={() => void moveToTrash(item)}>Delete</button>
                  </> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="admin-media-empty"><h2>No media matches.</h2><p>Try another filter or upload something new.</p><button type="button" className="button button-outline" onClick={() => { setSearch(""); setFilter("all"); }}>View all media</button></div>}

      {pages > 1 && <div className="admin-products-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Previous</button><span>Page {Math.min(page, pages)} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next →</button></div>}

      <input ref={replaceInputRef} className="sr-only" type="file" accept={replaceTarget?.resourceType === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} onChange={onReplaceFileChange} />
      {replaceTarget && upload.mode !== "idle" && <div className="admin-media-floating-progress" role="status"><b>Replacing {replaceTarget.label}</b><p>{upload.mode === "signing" ? "Preparing upload…" : upload.mode === "uploading" ? `Uploading ${upload.progress}%` : upload.mode === "finalising" ? "Saving replacement…" : upload.message}</p>{upload.mode === "uploading" && <button type="button" onClick={() => xhrRef.current?.abort()}>Cancel</button>}</div>}

      {uploadOpen && <div className="admin-media-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && upload.mode === "idle") setUploadOpen(false); }}>
        <section className="admin-media-modal admin-media-upload-modal" role="dialog" aria-modal="true" aria-label="Upload media">
          <div className="admin-media-modal-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h2>Upload media</h2></div><button type="button" aria-label="Close upload" onClick={() => setUploadOpen(false)} disabled={!["idle", "error"].includes(upload.mode)}>×</button></div>
          <button className="admin-media-file-picker" type="button" onClick={() => uploadInputRef.current?.click()}><span>+</span><b>{uploadDraft.file ? uploadDraft.file.name : "Choose a photo or short video"}</b><small>JPG/PNG/WebP ≤8 MB · MP4/WebM ≤20 MB and ≤10 seconds</small></button>
          <input ref={uploadInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={onUploadFileChange} />
          <label className="admin-editor-field"><span>Image/video description</span><input value={uploadDraft.alt} onChange={(event) => setUploadDraft((current) => ({ ...current, alt: event.target.value.slice(0, 300) }))} placeholder="Describe what is shown" /><small>Used by screen readers and media search.</small></label>
          <label className="admin-editor-field"><span>Caption (optional)</span><textarea value={uploadDraft.caption} onChange={(event) => setUploadDraft((current) => ({ ...current, caption: event.target.value.slice(0, 500) }))} rows={3} placeholder="Public-facing caption if this asset is published" /></label>
          <label className="admin-editor-field"><span>Media type / provenance</span><BrandSelect value={uploadDraft.provenance} options={provenances} onChange={(value) => setUploadDraft((current) => ({ ...current, provenance: value, generated: value === "real-work" || value === "actual-product" ? false : current.generated, actualItem: value === "actual-product" }))} ariaLabel="Media provenance" /></label>
          <label className="admin-look-check-row"><input type="checkbox" checked={uploadDraft.consentConfirmed} onChange={(event) => setUploadDraft((current) => ({ ...current, consentConfirmed: event.target.checked }))} /><span><b>I have permission to publish this media</b><small>Required for identifiable real client work.</small></span></label>
          {upload.mode !== "idle" && <div className="admin-upload-progress" role="status"><div><span style={{ width: `${upload.progress}%` }} /></div><p>{upload.mode === "signing" ? "Preparing upload…" : upload.mode === "uploading" ? `Uploading ${upload.progress}%` : upload.mode === "finalising" ? "Saving media…" : upload.message}</p>{upload.mode === "uploading" && <button type="button" onClick={() => xhrRef.current?.abort()}>Cancel</button>}</div>}
          <div className="admin-media-modal-actions"><button className="button button-outline" type="button" onClick={() => setUploadOpen(false)} disabled={!['idle','error'].includes(upload.mode)}>Cancel</button><button className="button button-primary" type="button" disabled={!uploadDraft.file || !['idle','error'].includes(upload.mode)} onClick={() => uploadDraft.file && void uploadFile(uploadDraft.file)}>{upload.mode === "error" ? "Retry upload" : "Upload media"}</button></div>
        </section>
      </div>}

      {selected && detailsDraft && <div className="admin-media-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
        <section className="admin-media-modal admin-media-details-modal" role="dialog" aria-modal="true" aria-label={`Media details for ${selected.label}`}>
          <div className="admin-media-modal-head"><div><div className="eyebrow">MEDIA DETAILS</div><h2>{selected.label}</h2></div><button type="button" aria-label="Close media details" onClick={closeDetails}>×</button></div>
          <div className="admin-media-details-grid">
            <div>
              <div className="admin-media-detail-preview"><MediaPreview item={detailsDraft} focalEditor={!selected.starter && detailsDraft.resourceType === "image"} onFocal={(x, y) => setDetailsDraft((current) => current ? { ...current, focal: { x, y } } : current)} /></div>
              {detailsDraft.resourceType === "image" && !selected.starter && <div className="admin-focal-help"><span>Click the image to set its focal point.</span><button type="button" onClick={() => setDetailsDraft((current) => current ? { ...current, focal: { x: .5, y: .5 } } : current)}>Center</button></div>}
              {detailsDraft.resourceType === "image" && <div className="admin-media-crop-previews" aria-label="Focal point crop previews"><figure><span><Image src={detailsDraft.secureUrl} alt="" fill sizes="260px" style={{ objectFit: "cover", objectPosition: `${detailsDraft.focal.x * 100}% ${detailsDraft.focal.y * 100}%` }} /></span><figcaption>Desktop crop</figcaption></figure><figure><span><Image src={detailsDraft.secureUrl} alt="" fill sizes="140px" style={{ objectFit: "cover", objectPosition: `${detailsDraft.focal.x * 100}% ${detailsDraft.focal.y * 100}%` }} /></span><figcaption>Mobile crop</figcaption></figure></div>}
              <dl className="admin-media-tech"><div><dt>Type</dt><dd>{detailsDraft.resourceType} · {detailsDraft.format || "—"}</dd></div><div><dt>Size</dt><dd>{formatBytes(detailsDraft.bytes)}</dd></div><div><dt>Dimensions</dt><dd>{detailsDraft.width && detailsDraft.height ? `${detailsDraft.width} × ${detailsDraft.height}` : "—"}</dd></div>{detailsDraft.duration ? <div><dt>Duration</dt><dd>{detailsDraft.duration.toFixed(1)}s</dd></div> : null}{detailsDraft.dominantColor ? <div><dt>Dominant colour</dt><dd><span className="admin-media-colour-swatch" style={{ background: detailsDraft.dominantColor }} />{detailsDraft.dominantColor}</dd></div> : null}</dl>
            </div>
            <div>
              {selected.starter ? <div className="admin-media-bundled-note">This media currently comes with the website. Use “Use current site content” in Business Details to make it a normal editable Media Library item.</div> : <>
                <label className="admin-editor-field"><span>Description / alt text</span><input value={detailsDraft.alt} onChange={(event) => setDetailsDraft((current) => current ? { ...current, alt: event.target.value.slice(0, 300) } : current)} /></label>
                <label className="admin-editor-field"><span>Caption</span><textarea rows={3} value={detailsDraft.caption} onChange={(event) => setDetailsDraft((current) => current ? { ...current, caption: event.target.value.slice(0, 500) } : current)} /></label>
                <label className="admin-editor-field"><span>Media type / provenance</span><BrandSelect value={detailsDraft.provenance} options={provenances} onChange={(value) => setDetailsDraft((current) => current ? { ...current, provenance: value, generated: value === "real-work" || value === "actual-product" ? false : current.generated, actualItem: value === "actual-product" } : current)} ariaLabel="Media provenance" /></label>
                <label className="admin-look-check-row"><input type="checkbox" checked={detailsDraft.consentConfirmed} onChange={(event) => setDetailsDraft((current) => current ? { ...current, consentConfirmed: event.target.checked } : current)} /><span><b>Permission confirmed</b><small>Required when identifiable client work is published.</small></span></label>
                <button type="button" className="button button-primary admin-media-save-details" onClick={() => void saveDetails()}>Save details</button>
              </>}

              <div className="admin-media-references"><div className="admin-editor-section-head"><div><h3>Used on {detailsDraft.references.length} item{detailsDraft.references.length === 1 ? "" : "s"}</h3><p>Remove or replace these references before deleting the media.</p></div></div>{detailsDraft.references.length ? <div>{detailsDraft.references.map((reference) => reference.href?.startsWith("/admin") ? <Link key={`${reference.type}:${reference.id}`} href={reference.href}><span><b>{reference.title}</b><small>{reference.type}{reference.status ? ` · ${reference.status}` : ""}</small></span><span aria-hidden="true">↗</span></Link> : <a key={`${reference.type}:${reference.id}`} href={reference.href || "#"} target="_blank" rel="noopener noreferrer"><span><b>{reference.title}</b><small>current website use</small></span><span aria-hidden="true">↗</span></a>)}</div> : <p className="admin-media-unused">This asset is currently unused and can be moved to Trash safely.</p>}</div>
            </div>
          </div>
          {feedback && <div className="admin-media-modal-feedback" role="status">{feedback}</div>}
          <div className="admin-media-modal-actions"><button type="button" className="button button-outline" onClick={closeDetails}>Close</button>{!selected.starter && selected.status === "active" && <button type="button" className="button button-outline" onClick={() => openReplace(selected)}>Replace file</button>}</div>
        </section>
      </div>}
    </main>
  );
}

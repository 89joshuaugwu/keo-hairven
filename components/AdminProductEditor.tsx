"use client";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { ModalDialog } from "@/components/ModalDialog";
import { useCategoryOptions } from "@/components/CategoryProvider";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandSelect, type BrandSelectOption } from "@/components/BrandSelect";
import { adminFetch, getAdminCsrfToken } from "@/lib/admin-client";
import type { AdminMediaRecord, AdminProductRecord, AdminProductVariant } from "@/lib/admin-product-shared";
import type { ProductAvailability, ProductCategory, ProductPriceMode } from "@/lib/products";

const priceOptions: readonly BrandSelectOption<ProductPriceMode>[] = [
  { value: "fixed", label: "Fixed price" },
  { value: "from", label: "From price" },
  { value: "range", label: "Price range" },
  { value: "quote", label: "Price on enquiry" },
  { value: "hidden", label: "Hide price" },
];
const availabilityOptions: readonly BrandSelectOption<ProductAvailability>[] = [
  { value: "confirm", label: "Confirm availability" },
  { value: "available", label: "Available" },
  { value: "made-to-order", label: "Made to order" },
  { value: "unavailable", label: "Unavailable" },
];

function nairaInput(minor?: number) {
  return Number.isInteger(minor) ? String((minor as number) / 100) : "";
}
function toMinor(value: string) {
  const number = Number(value.replace(/,/g, ""));
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : undefined;
}
function randomVariantId() { return `variant-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

type UploadState = { mode: "idle" | "signing" | "uploading" | "finalising" | "error"; progress: number; message?: string };

type Props = {
  initialProduct: AdminProductRecord;
  initialMedia: AdminMediaRecord[];
  starterFallbackImage?: string;
  isNew: boolean;
};

export function AdminProductEditor({ initialProduct, initialMedia, starterFallbackImage, isNew }: Props) {
  const categoryOptions = useCategoryOptions("products","Choose a category","");
  const router = useRouter();
  const [recordId, setRecordId] = useState(isNew ? "" : initialProduct.id);
  const [revision, setRevision] = useState(isNew ? 0 : initialProduct.revision);
  const [status, setStatus] = useState(initialProduct.preview ? "draft" : initialProduct.status);
  const [title, setTitle] = useState(initialProduct.title || "");
  const [category, setCategory] = useState<"" | ProductCategory>(initialProduct.category || "");
  const [description, setDescription] = useState(initialProduct.description || "");
  const [productType, setProductType] = useState(initialProduct.productType || "");
  const [hairMaterial, setHairMaterial] = useState(initialProduct.hairMaterial || "");
  const [hairTexture, setHairTexture] = useState(initialProduct.hairTexture || "");
  const [hairColour, setHairColour] = useState(initialProduct.hairColour || "");
  const [hairDensity, setHairDensity] = useState(initialProduct.hairDensity || "");
  const [laceType, setLaceType] = useState(initialProduct.laceType || "");
  const [sku, setSku] = useState(initialProduct.sku || "");
  const [careInstructions, setCareInstructions] = useState(initialProduct.careInstructions || "");

  const [priceMode, setPriceMode] = useState<ProductPriceMode>(initialProduct.priceMode || "quote");
  const [price, setPrice] = useState(nairaInput(initialProduct.priceMinor));
  const [minPrice, setMinPrice] = useState(nairaInput(initialProduct.minPriceMinor));
  const [maxPrice, setMaxPrice] = useState(nairaInput(initialProduct.maxPriceMinor));
  const [availability, setAvailability] = useState<ProductAvailability>(initialProduct.availability || "confirm");
  const [ownerConfirmed, setOwnerConfirmed] = useState(initialProduct.ownerConfirmed);
  const [variants, setVariants] = useState<AdminProductVariant[]>(initialProduct.variants || []);
  const [media, setMedia] = useState<AdminMediaRecord[]>(initialMedia);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [upload, setUpload] = useState<UploadState>({ mode: "idle", progress: 0 });
  const [mediaOpen, setMediaOpen] = useState(false);
  const [library, setLibrary] = useState<AdminMediaRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const markDirty = () => { setDirty(true); if (saveState === "saved") setSaveState("idle"); };

  const primaryMedia = media[0];
  const displayImage = primaryMedia?.secureUrl || starterFallbackImage || "/assets/campaign/hair-collection.webp";
  const displayAlt = primaryMedia?.alt || "Product image";
  const displayPrice = useMemo(() => {
    if (priceMode === "hidden") return "Price hidden";
    if (priceMode === "quote") return "Price on enquiry";
    if (priceMode === "fixed" && price) return `₦${Number(price || 0).toLocaleString("en-NG")}`;
    if (priceMode === "from" && minPrice) return `From ₦${Number(minPrice || 0).toLocaleString("en-NG")}`;
    if (priceMode === "range" && minPrice && maxPrice) return `₦${Number(minPrice).toLocaleString("en-NG")} – ₦${Number(maxPrice).toLocaleString("en-NG")}`;
    return "Price on enquiry";
  }, [priceMode, price, minPrice, maxPrice]);

  const payload = () => ({
    id: recordId || initialProduct.id,
    slug: initialProduct.slug,
    title,
    category,
    description,
    productType,
    hairMaterial,
    hairTexture,
    hairColour,
    hairDensity,
    laceType,
    sku,
    careInstructions,
    priceMode,
    ...(toMinor(price) !== undefined ? { priceMinor: toMinor(price) } : {}),
    ...(toMinor(minPrice) !== undefined ? { minPriceMinor: toMinor(minPrice) } : {}),
    ...(toMinor(maxPrice) !== undefined ? { maxPriceMinor: toMinor(maxPrice) } : {}),
    currency: "NGN" as const,
    availability,
    mediaIds: media.map((item) => item.id),
    variants,
    ownerConfirmed,
    status,
    revision,
    rawSourceText: initialProduct.rawSourceText,
  });

  async function saveDraft() {
    if (saveState === "saving") return null;
    setSaveState("saving"); setFeedback(""); setFieldErrors({});
    try {
      const current = payload();
      const creating = !recordId;
      const response = await adminFetch(creating ? "/api/admin/products" : `/api/admin/products/${recordId}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? current : { ...current, expectedRevision: revision }),
      });
      const data = await response.json().catch(() => ({})) as { id?: string; revision?: number; message?: string; fieldErrors?: Record<string,string>; code?: string };
      if (!response.ok) {
        if (response.status === 409) setSaveState("conflict"); else setSaveState("error");
        setFeedback(data.message || "The draft could not be saved."); setFieldErrors(data.fieldErrors || {}); return null;
      }
      const nextId = data.id || recordId; const nextRevision = data.revision || revision;
      setRecordId(nextId); setRevision(nextRevision); if (creating) setStatus("draft"); setDirty(false); setSaveState("saved"); setFeedback("Saved just now.");
      if (creating && nextId) router.replace(`/admin/products/${nextId}`);
      return { id: nextId, revision: nextRevision };
    } catch { setSaveState("error"); setFeedback("The draft could not be saved. Check your connection and try again."); return null; }
  }

  async function publishProduct() {
    const saved = dirty || !recordId ? await saveDraft() : { id: recordId, revision };
    if (!saved?.id) return;
    setFeedback("Publishing…"); setFieldErrors({});
    const response = await adminFetch(`/api/admin/products/${saved.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: saved.revision }) });
    const data = await response.json().catch(() => ({})) as { revision?: number; message?: string; fieldErrors?: Record<string,string>; slug?: string };
    if (!response.ok) { setFeedback(data.message || "The product could not be published."); setFieldErrors(data.fieldErrors || {}); return; }
    setRevision(data.revision || saved.revision + 1); setStatus("published"); setSaveState("saved"); setFeedback("Product published. View it on your website."); setDirty(false);
  }

  function updatePrimaryAlt(value: string) {
    if (!primaryMedia) return;
    setMedia((current) => current.map((item, index) => index === 0 ? { ...item, alt: value } : item));
    markDirty();
  }

  async function persistPrimaryAlt() {
    const current = media[0];
    if (!current?.id) return;
    await adminFetch(`/api/admin/media/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: current.alt }) }).catch(() => undefined);
  }

  async function openMediaLibrary() {
    setMediaOpen(true); setLibraryLoading(true);
    try { const response = await adminFetch("/api/admin/media", { cache: "no-store" }); const data = await response.json() as { media?: AdminMediaRecord[] }; setLibrary(data.media || []); }
    finally { setLibraryLoading(false); }
  }

  async function uploadFile(file: File) {
    lastFileRef.current = file;
    if (!(["image/jpeg","image/png","image/webp"].includes(file.type)) || file.size > 8*1024*1024) { setUpload({ mode:"error", progress:0, message:"Use a JPG, PNG or WebP image up to 8 MB." }); return; }
    setUpload({ mode:"signing", progress:0 });
    const signResponse = await adminFetch("/api/admin/media/sign", { method:"POST", headers:{"Content-Type":"application/json"}, body:"{}" });
    const signed = await signResponse.json().catch(() => ({})) as { uploadUrl?:string; apiKey?:string; params?:Record<string,string|number>; signature?:string; message?:string };
    if (!signResponse.ok || !signed.uploadUrl || !signed.apiKey || !signed.params || !signed.signature) { setUpload({ mode:"error", progress:0, message:signed.message || "Could not prepare the upload." }); return; }

    const form = new FormData(); form.append("file", file); form.append("api_key", signed.apiKey); form.append("signature", signed.signature); Object.entries(signed.params).forEach(([key,value]) => form.append(key, String(value)));
    setUpload({ mode:"uploading", progress:1 });
    const cloudinary = await new Promise<Record<string,unknown>>((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhrRef.current = xhr; xhr.open("POST", signed.uploadUrl as string); xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUpload({ mode:"uploading", progress:Math.max(1, Math.round((event.loaded/event.total)*100)) }); };
      xhr.onerror = () => reject(new Error("Upload failed.")); xhr.onabort = () => reject(new Error("Upload cancelled.")); xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText) as Record<string,unknown>); } catch { reject(new Error("Upload response was invalid.")); } } else reject(new Error("Upload failed.")); }; xhr.send(form);
    }).catch((error) => { setUpload({ mode:"error", progress:0, message:error instanceof Error ? error.message : "Upload failed." }); return null; });
    xhrRef.current = null; if (!cloudinary) return;
    setUpload({ mode:"finalising", progress:100 });
    const finalize = await adminFetch("/api/admin/media/finalize", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...cloudinary, alt:"" }) });
    const result = await finalize.json().catch(() => ({})) as { media?:AdminMediaRecord; message?:string };
    if (!finalize.ok || !result.media) { setUpload({ mode:"error", progress:0, message:result.message || "The uploaded image could not be saved." }); return; }
    setMedia((current) => [result.media as AdminMediaRecord, ...current.filter((item) => item.id !== result.media?.id)]); markDirty(); setUpload({ mode:"idle", progress:0 });
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); event.target.value = ""; };

  const addVariant = () => { setVariants((current) => [...current, { id:randomVariantId(), label:"", priceMode:"fixed" }]); markDirty(); };
  const updateVariant = (id:string, patch:Partial<AdminProductVariant>) => { setVariants((current) => current.map((variant) => variant.id === id ? { ...variant, ...patch } : variant)); markDirty(); };

  return (
    <div className="admin-product-editor-content">
      <div className="admin-product-editor-head"><div><div className="eyebrow">KEO HAIRVEN</div><h1>{recordId || initialProduct.preview ? "Edit product" : "Add product"}</h1></div></div>
      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-left">
          <section className="admin-editor-panel">
            <h2>1. Product details</h2>
            <label className="admin-editor-field"><span>Product name</span><input value={title} onChange={(e) => { setTitle(e.target.value.slice(0,140)); markDirty(); }} />{fieldErrors.title && <small className="is-error">{fieldErrors.title}</small>}</label>
            <div className="admin-editor-field"><span>Category</span><BrandSelect value={category} options={categoryOptions} onChange={(value) => { setCategory(value); markDirty(); }} ariaLabel="Choose product category" /><small>Confirm the item category before publishing.</small>{fieldErrors.category && <small className="is-error">{fieldErrors.category}</small>}</div>
            <label className="admin-editor-field"><span>Description</span><textarea rows={5} value={description} onChange={(e) => { setDescription(e.target.value.slice(0,3000)); markDirty(); }} placeholder="Describe exactly what the customer will receive." />{fieldErrors.description && <small className="is-error">{fieldErrors.description}</small>}</label>
            <div className="admin-editor-two">
              <div className="admin-editor-field"><span>Price display</span><BrandSelect value={priceMode} options={priceOptions} onChange={(value) => { setPriceMode(value); markDirty(); }} ariaLabel="Choose price display" /></div>
              {priceMode === "fixed" && <label className="admin-editor-field"><span>Amount (₦)</span><input inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value.replace(/[^0-9.]/g, "")); markDirty(); }} />{fieldErrors.priceMinor && <small className="is-error">{fieldErrors.priceMinor}</small>}</label>}
              {priceMode === "from" && <label className="admin-editor-field"><span>From (₦)</span><input inputMode="decimal" value={minPrice} onChange={(e) => { setMinPrice(e.target.value.replace(/[^0-9.]/g, "")); markDirty(); }} />{fieldErrors.minPriceMinor && <small className="is-error">{fieldErrors.minPriceMinor}</small>}</label>}
              {priceMode === "range" && <><label className="admin-editor-field"><span>Minimum (₦)</span><input inputMode="decimal" value={minPrice} onChange={(e) => { setMinPrice(e.target.value.replace(/[^0-9.]/g, "")); markDirty(); }} /></label><label className="admin-editor-field"><span>Maximum (₦)</span><input inputMode="decimal" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value.replace(/[^0-9.]/g, "")); markDirty(); }} />{fieldErrors.range && <small className="is-error">{fieldErrors.range}</small>}</label></>}
            </div>
            <div className="admin-editor-field"><span>Availability</span><BrandSelect value={availability} options={availabilityOptions} onChange={(value) => { setAvailability(value); markDirty(); }} ariaLabel="Choose availability" /></div>

            <div className="admin-editor-field" style={{marginTop:18}}><h3>Hair specifications</h3><small>Only add verified specifications. Leave irrelevant fields blank.</small></div>
            <div className="keo-edit-grid">
              <label className="keo-edit-field"><span>Product type</span><input value={productType} placeholder="Wig, bundle or extension" maxLength={120} onChange={e=>{setProductType(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Hair material</span><input value={hairMaterial} placeholder="Human hair or other material" maxLength={120} onChange={e=>{setHairMaterial(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Hair texture</span><input value={hairTexture} placeholder="Bone straight, body wave, curly" maxLength={120} onChange={e=>{setHairTexture(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Hair colour</span><input value={hairColour} placeholder="Natural black" maxLength={120} onChange={e=>{setHairColour(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Density (if relevant)</span><input value={hairDensity} placeholder="180%" maxLength={120} onChange={e=>{setHairDensity(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Lace or closure (if relevant)</span><input value={laceType} placeholder="4×4 closure" maxLength={120} onChange={e=>{setLaceType(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Reference / SKU</span><input value={sku} placeholder="KEO-BS-001" maxLength={120} onChange={e=>{setSku(e.target.value);markDirty();}} /></label>
              <label className="keo-edit-field"><span>Hair care instructions</span><input value={careInstructions} placeholder="Care information for this product" maxLength={600} onChange={e=>{setCareInstructions(e.target.value);markDirty();}} /></label>
            </div>
          </section>

          <section className="admin-editor-panel">
            <h2>2. Photos</h2>
            <div className="admin-product-uploadbox">
              <span className="admin-upload-plus" aria-hidden="true">+</span><h3>Add your product photos</h3><p>Choose from your phone or media library.</p>
              <div className="admin-upload-actions"><button className="button button-outline" type="button" onClick={() => fileInputRef.current?.click()}>Choose photos</button><button className="button button-outline" type="button" onClick={() => void openMediaLibrary()}>Media library</button></div>
              <small>JPG, PNG or WebP · up to 8 MB each</small><input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
              {upload.mode !== "idle" && <div className="admin-upload-progress" role="status"><div><span style={{ width:`${upload.progress}%` }} /></div><p>{upload.mode === "signing" ? "Preparing upload…" : upload.mode === "uploading" ? `Uploading ${upload.progress}%` : upload.mode === "finalising" ? "Saving photo…" : upload.message}</p>{upload.mode === "uploading" && <button type="button" onClick={() => xhrRef.current?.abort()}>Cancel</button>}{upload.mode === "error" && lastFileRef.current && <button type="button" onClick={() => void uploadFile(lastFileRef.current as File)}>Retry</button>}</div>}
            </div>
            {media.length > 0 && <div className="admin-selected-media">{media.map((item, index) => <button type="button" key={item.id} className={index === 0 ? "is-primary" : ""} onClick={() => { setMedia((current) => [item, ...current.filter((x) => x.id !== item.id)]); markDirty(); }}><span className="admin-selected-media-image"><Image src={item.secureUrl} alt={item.alt || "Selected product media"} fill sizes="92px" style={{ objectFit:"cover" }} /></span><span>{index === 0 ? "Primary" : "Use as primary"}</span></button>)}</div>}
            <label className="admin-editor-field"><span>Image description</span><input value={primaryMedia?.alt || ""} onChange={(e) => updatePrimaryAlt(e.target.value.slice(0,300))} onBlur={() => void persistPrimaryAlt()} placeholder="Describe the actual product in the photo" /><small>Used by screen readers.</small>{fieldErrors.mediaAlt && <small className="is-error">{fieldErrors.mediaAlt}</small>}{fieldErrors.mediaIds && <small className="is-error">{fieldErrors.mediaIds}</small>}</label>
          </section>

          <section className="admin-editor-panel admin-variant-panel">
            <div className="admin-editor-section-head"><div><h2>3. Options <span>(optional)</span></h2><p>Add sizes or lengths only when they are truly options of this product.</p></div><button type="button" className="button button-outline" onClick={addVariant}>+ Add option</button></div>
            {variants.length === 0 ? <div className="admin-variant-empty">No product options added.</div> : variants.map((variant, index) => <div className="admin-variant-row" key={variant.id}>
              <label><span>Label</span><input value={variant.label} onChange={(e) => updateVariant(variant.id,{label:e.target.value.slice(0,80)})} placeholder="e.g. 14 inches" /></label>
              <label><span>Length</span><input inputMode="numeric" value={variant.lengthInches ?? ""} onChange={(e) => updateVariant(variant.id,{lengthInches:e.target.value ? Number(e.target.value) : undefined})} placeholder="14" /></label>
              <label><span>Colour</span><input value={variant.colour || ""} onChange={(e) => updateVariant(variant.id,{colour:e.target.value.slice(0,80)})} placeholder="Natural black" /></label>
              <label><span>SKU</span><input value={variant.sku || ""} onChange={(e) => updateVariant(variant.id,{sku:e.target.value.slice(0,80)})} placeholder="KEO-BS-18" /></label>
              <label><span>Price (₦)</span><input inputMode="decimal" value={nairaInput(variant.priceMinor)} onChange={(e) => updateVariant(variant.id,{priceMinor:toMinor(e.target.value),priceMode:"fixed"})} placeholder="50000" /></label>
              <button type="button" aria-label={`Remove option ${index+1}`} onClick={() => { setVariants((current) => current.filter((x) => x.id !== variant.id)); markDirty(); }}>×</button>
            </div>)}
          </section>
        </div>

        <aside className="admin-product-editor-right">
          <section className="admin-editor-panel" id="product-preview-card"><h2>Preview</h2><figure className="admin-product-preview-media"><Image src={displayImage} alt={displayAlt} fill sizes="(max-width:900px) 100vw, 340px" style={{ objectFit:"cover" }} /></figure><h3>{title || "Untitled product"}</h3><strong>{displayPrice}</strong><div className={`admin-product-preview-status is-${status}`}>{status === "published" ? "Published · visible on website" : "Draft · not visible on website"}</div></section>
          <section className="admin-editor-panel admin-publishing-panel"><h2>Publishing</h2><div className="admin-publish-row"><div><b>Save as draft</b><p>Keep working privately.</p></div><span>✓</span></div><div className="admin-publish-row"><div><b>Publish after review</b><p>Confirm description, actual photo and price.</p></div><span>{status === "published" ? "✓" : "○"}</span></div><label className="admin-confirm-product"><input type="checkbox" checked={ownerConfirmed} onChange={(e) => { setOwnerConfirmed(e.target.checked); markDirty(); }} /><span>I confirm the exact product details and actual item photos are correct.</span></label>{fieldErrors.ownerConfirmed && <small className="is-error">{fieldErrors.ownerConfirmed}</small>}<button className="button button-primary" type="button" onClick={() => void publishProduct()}>Publish product <span aria-hidden="true">↗</span></button></section>
        </aside>
      </div>

      <div className="admin-product-savebar"><span>{saveState === "saving" ? "Saving…" : saveState === "saved" ? feedback : saveState === "conflict" ? "Conflict — refresh before continuing" : dirty ? "Unsaved changes" : feedback || "No unsaved changes"}</span><button className="button button-outline" type="button" disabled={saveState === "saving"} onClick={() => void saveDraft()}>Save draft</button><button className="button button-primary" type="button" onClick={() => document.getElementById("product-preview-card")?.scrollIntoView({ behavior:"smooth", block:"center" })}>Preview <span aria-hidden="true">→</span></button></div>
      {(saveState === "error" || saveState === "conflict" || (feedback && !["Saved just now.","Product published. View it on your website."].includes(feedback))) && <div className="admin-editor-feedback" role="alert">{feedback}{saveState === "conflict" && <button type="button" onClick={() => window.location.reload()}>Refresh editor</button>}</div>}

      {mediaOpen && <ModalDialog open onClose={() => setMediaOpen(false)} label="Choose product media" className="studio-media-dialog"><section className="admin-media-picker"><div className="admin-media-picker-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h2>Choose a photo</h2></div><button type="button" aria-label="Close media library" onClick={() => setMediaOpen(false)}>×</button></div>{libraryLoading ? <p>Loading media…</p> : library.length ? <div className="admin-media-picker-grid">{library.map((item) => <button type="button" key={item.id} onClick={() => { setMedia((current) => [item, ...current.filter((x) => x.id !== item.id)]); setMediaOpen(false); markDirty(); }}><span><Image src={item.secureUrl} alt={item.alt || "Media library image"} fill sizes="140px" style={{ objectFit:"cover" }} /></span><small>{item.alt || "No image description yet"}</small></button>)}</div> : <div className="admin-media-picker-empty"><h3>No uploaded photos yet.</h3><p>Upload the first actual product photo from this editor.</p></div>}</section></ModalDialog>}
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  );
}

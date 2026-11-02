"use client";
import { useCategoryOptions, useCategoryLabel } from "@/components/CategoryProvider";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandSelect, type BrandSelectOption } from "@/components/BrandSelect";
import { adminFetch } from "@/lib/admin-client";
import type { AdminLookListItem } from "@/lib/look-admin-shared";
import { lookProvenanceLabel, type AdminLookStatus } from "@/lib/look-admin-shared";
import type { LookCategory, LookProvenance } from "@/lib/gallery";

type StatusFilter = "all" | AdminLookStatus;
type CategoryFilter = "all" | LookCategory;
type ProvenanceFilter = "all" | LookProvenance;

const statusOptions: readonly BrandSelectOption<StatusFilter>[] = [
  { value: "all", label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];
const provenanceOptions: readonly BrandSelectOption<ProvenanceFilter>[] = [
  { value: "all", label: "All labels" },
  { value: "real-work", label: "KEO Hairven’s work" },
  { value: "inspiration", label: "Style inspiration" },
  { value: "campaign", label: "Campaign inspiration" },
];

function GalleryThumb({ look }: { look: AdminLookListItem }) {
  if (!look.thumbnail) return <div className="admin-gallery-thumb is-empty"><span>No media</span></div>;
  if (look.thumbnailKind === "video") {
    return <div className="admin-gallery-thumb"><video src={look.thumbnail} muted playsInline preload="metadata" aria-label={look.imageAlt || look.title} /></div>;
  }
  return <div className="admin-gallery-thumb"><Image src={look.thumbnail} alt={look.imageAlt || look.title} fill sizes="(max-width: 700px) 100vw, 30vw" style={{ objectFit: "cover" }} /></div>;
}

export function AdminGalleryClient({ initialLooks }: { initialLooks: AdminLookListItem[] }) {
  const labelForCategory=useCategoryLabel("gallery");
  const categoryOptions = useCategoryOptions("gallery","All categories","all");
  const [looks, setLooks] = useState(initialLooks);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [provenance, setProvenance] = useState<ProvenanceFilter>("all");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const pageSize = 6;

  const filtered = useMemo(() => looks.filter((look) => {
    if (look.status === "trashed") return false;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || look.title.toLowerCase().includes(needle) || look.caption.toLowerCase().includes(needle);
    const matchesStatus = status === "all" || look.status === status;
    const matchesCategory = category === "all" || look.category === category;
    const matchesProvenance = provenance === "all" || look.provenance === provenance;
    return matchesQuery && matchesStatus && matchesCategory && matchesProvenance;
  }), [looks, query, status, category, provenance]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const refresh = async () => {
    const response = await adminFetch("/api/admin/looks", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { looks?: AdminLookListItem[] };
    if (data.looks) setLooks(data.looks);
  };

  const action = async (look: AdminLookListItem, name: "duplicate" | "unpublish" | "restore" | "trash") => {
    if (look.preview) return;
    setBusyId(look.id); setMenuId(null); setNotice("");
    try {
      const url = name === "trash" ? `/api/admin/looks/${look.id}` : `/api/admin/looks/${look.id}/${name}`;
      const response = await adminFetch(url, {
        method: name === "trash" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: look.revision }),
      });
      const data = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(data.message || "That action could not be completed.");
      setNotice(name === "duplicate" ? "Look duplicated as a draft." : name === "restore" ? "Look restored as a draft." : name === "unpublish" ? "Look hidden from the public gallery." : "Look moved to Trash.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That action could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-gallery-content">
      <div className="admin-gallery-head">
        <div><div className="eyebrow">KEO HAIRVEN</div><h1>Share your beautiful work</h1></div>
        <Link href="/admin/gallery/new" className="button button-primary">+ Add a look</Link>
      </div>

      <div className="admin-gallery-toolbar">
        <label className="admin-gallery-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search looks" aria-label="Search gallery looks" /></label>
        <BrandSelect value={category} options={categoryOptions} onChange={(value) => { setCategory(value); setPage(1); }} ariaLabel="Filter gallery by category" />
        <BrandSelect value={provenance} options={provenanceOptions} onChange={(value) => { setProvenance(value); setPage(1); }} ariaLabel="Filter gallery by label" />
        <BrandSelect value={status} options={statusOptions} onChange={(value) => { setStatus(value); setPage(1); }} ariaLabel="Filter gallery by status" />
      </div>

      {notice && <div className="admin-gallery-feedback" role="status">{notice}</div>}

      {visible.length ? (
        <div className="admin-gallery-grid">
          {visible.map((look) => {
            const editHref = look.preview ? `/admin/gallery/new?starter=${encodeURIComponent(look.id)}` : `/admin/gallery/${look.id}`;
            const permissionText = look.provenance === "real-work" ? (look.clientPermission ? "Permission confirmed" : "Permission needed") : null;
            return (
              <article className="admin-gallery-card" key={look.id}>
                <GalleryThumb look={look} />
                <div className="admin-gallery-card-body">
                  <div className="admin-gallery-card-meta"><span className={`admin-product-status is-${look.status}`}>{look.preview ? "Draft" : look.status}</span>{permissionText && <span className={`admin-gallery-permission${look.clientPermission ? " is-ok" : " is-warning"}`}>{permissionText}</span>}</div>
                  <h2>{look.title}</h2>
                  <p>{labelForCategory(look.category)}</p>
                  <Link href={editHref} className="button button-outline">Edit details <span aria-hidden="true">→</span></Link>
                  {!look.preview && <div className="admin-gallery-card-actions">
                    <button type="button" aria-label={`More actions for ${look.title}`} aria-expanded={menuId === look.id} onClick={() => setMenuId((current) => current === look.id ? null : look.id)}>••• More</button>
                    {menuId === look.id && <div className="admin-product-menu admin-gallery-menu">
                      <button type="button" disabled={busyId === look.id} onClick={() => void action(look, "duplicate")}>Duplicate to draft</button>
                      {look.status === "published" && <button type="button" disabled={busyId === look.id} onClick={() => void action(look, "unpublish")}>Unpublish</button>}
                      {look.status === "trashed" ? <button type="button" disabled={busyId === look.id} onClick={() => void action(look, "restore")}>Restore as draft</button> : <button type="button" className="is-danger" disabled={busyId === look.id} onClick={() => void action(look, "trash")}>Move to Trash</button>}
                    </div>}
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="admin-products-empty"><h2>No looks match.</h2><p>Try another search or filter.</p></div>}

      {pageCount > 1 && <nav className="admin-products-pagination" aria-label="Gallery pages">
        <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Previous</button>
        <span>Page {currentPage} of {pageCount}</span>
        <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next →</button>
      </nav>}
    </div>
  );
}

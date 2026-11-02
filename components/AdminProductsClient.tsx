"use client";
import { useCategoryOptions } from "@/components/CategoryProvider";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandSelect, type BrandSelectOption } from "@/components/BrandSelect";
import { adminFetch } from "@/lib/admin-client";
import { formatNairaMinor } from "@/lib/products";
import type { AdminProductListItem, AdminProductStatus } from "@/lib/admin-product-shared";

type StatusFilter = "all" | AdminProductStatus;
type CategoryFilter = string;

const statusOptions: readonly BrandSelectOption<StatusFilter>[] = [
  { value: "all", label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function priceLabel(product: AdminProductListItem) {
  if (product.priceMode === "fixed" && Number.isInteger(product.priceMinor)) return formatNairaMinor(product.priceMinor as number);
  if (product.priceMode === "from" && Number.isInteger(product.minPriceMinor)) return `From ${formatNairaMinor(product.minPriceMinor as number)}`;
  if (product.priceMode === "range" && Number.isInteger(product.minPriceMinor) && Number.isInteger(product.maxPriceMinor)) return `${formatNairaMinor(product.minPriceMinor as number)} – ${formatNairaMinor(product.maxPriceMinor as number)}`;
  if (product.priceMode === "hidden") return "Price hidden";
  return "Price on enquiry";
}

export function AdminProductsClient({ initialProducts }: { initialProducts: AdminProductListItem[] }) {
  const categoryOptions = useCategoryOptions("products","All categories","all");
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const pageSize = 6;

  const filtered = useMemo(() => products.filter((product) => {
    if (product.status === "trashed") return false;
    const matchesQuery = !query.trim() || product.title.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || product.status === status;
    const matchesCategory = category === "all" || product.category === category;
    return matchesQuery && matchesStatus && matchesCategory;
  }), [products, query, status, category]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const refresh = async () => {
    const response = await adminFetch("/api/admin/products", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { products?: AdminProductListItem[] };
    if (data.products) setProducts(data.products);
  };

  const action = async (product: AdminProductListItem, name: "duplicate" | "unpublish" | "restore" | "trash") => {
    if (product.preview) return;
    setBusyId(product.id); setMenuId(null); setNotice("");
    try {
      const url = name === "trash" ? `/api/admin/products/${product.id}` : `/api/admin/products/${product.id}/${name}`;
      const response = await adminFetch(url, { method: name === "trash" ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: product.revision }) });
      const data = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(data.message || "That action could not be completed.");
      setNotice(name === "duplicate" ? "Draft duplicated." : name === "restore" ? "Product restored as a draft." : name === "unpublish" ? "Product hidden from the public catalogue." : "Product moved to Trash.");
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "That action could not be completed."); }
    finally { setBusyId(null); }
  };

  return (
    <div className="admin-products-content">
      <div className="admin-products-head">
        <div><div className="eyebrow">KEO HAIRVEN</div><h1>Your products</h1></div>
        <Link href="/admin/products/new" className="button button-primary">+ Add product</Link>
      </div>

      <div className="admin-products-toolbar">
        <label className="admin-products-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search products" aria-label="Search products" /></label>
        <div className="admin-products-filters">
          <BrandSelect value={status} options={statusOptions} onChange={(value) => { setStatus(value); setPage(1); }} ariaLabel="Filter by status" />
          <BrandSelect value={category} options={categoryOptions} onChange={(value) => { setCategory(value); setPage(1); }} ariaLabel="Filter by category" />
        </div>
      </div>

      <div className="admin-products-notice">Drafts are only visible to you. Preview each product before publishing. <Link className="admin-recovery-link" href="/admin/trash">Recover removed items in Trash ?</Link></div>
      {notice && <div className="admin-products-feedback" role="status">{notice}</div>}

      <div className="admin-products-panel">
        {visible.length ? visible.map((product) => {
          const editHref = product.preview ? `/admin/products/new?starter=${encodeURIComponent(product.id)}` : `/admin/products/${product.id}`;
          return (
            <article className="admin-product-row" key={product.id}>
              <div className="admin-product-thumb">
                {product.thumbnail ? <Image src={product.thumbnail} alt={product.imageAlt || product.title} fill sizes="64px" style={{ objectFit: "cover" }} /> : <span>No photo</span>}
              </div>
              <div className="admin-product-main"><b>{product.title}</b><p>{product.description || "Add product details"}</p></div>
              <strong className="admin-product-price">{priceLabel(product)}</strong>
              <span className={`admin-product-status is-${product.status}`}>{product.preview ? "Draft" : product.status}</span>
              <div className="admin-product-actions">
                <Link href={editHref}>Edit ↗</Link>
                {!product.preview && (
                  <div className="admin-product-menu-wrap">
                    <button type="button" aria-label={`More actions for ${product.title}`} aria-expanded={menuId === product.id} onClick={() => setMenuId((current) => current === product.id ? null : product.id)}>•••</button>
                    {menuId === product.id && <div className="admin-product-menu">
                      <button type="button" disabled={busyId === product.id} onClick={() => void action(product, "duplicate")}>Duplicate to draft</button>
                      {product.status === "published" && <button type="button" disabled={busyId === product.id} onClick={() => void action(product, "unpublish")}>Unpublish</button>}
                      {product.status === "trashed" ? <button type="button" disabled={busyId === product.id} onClick={() => void action(product, "restore")}>Restore as draft</button> : <button type="button" className="is-danger" disabled={busyId === product.id} onClick={() => void action(product, "trash")}>Move to Trash</button>}
                    </div>}
                  </div>
                )}
              </div>
            </article>
          );
        }) : <div className="admin-products-empty"><h2>No products match.</h2><p>Try another search or filter.</p></div>}
      </div>

      {pageCount > 1 && <nav className="admin-products-pagination" aria-label="Product pages">
        <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Previous</button>
        <span>Page {currentPage} of {pageCount}</span>
        <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next →</button>
      </nav>}
    </div>
  );
}

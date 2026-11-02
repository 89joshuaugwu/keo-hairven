"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";
import type { CategoryRegistry, CategoryOperation } from "@/lib/category-shared";
export function AdminCategoriesClient({ initial, role }: {
    initial: CategoryRegistry[];
    role: string;
}) {
    const router = useRouter();
    const [groups, setGroups] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [names, setNames] = useState<Record<string, string>>({});
    async function save(group: CategoryRegistry, operation: CategoryOperation) { setBusy(true); setError(""); try {
        const r = await adminFetch(`/api/admin/categories/${group.group}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: group.revision, operation }) });
        const data = await r.json();
        if (!r.ok)
            throw Error(data.message);
        setGroups(v => v.map(g => g.group === group.group ? data : g));
        if (operation.type === "create")
            setNames(v => ({ ...v, [group.group]: "" }));
        setConfirmDelete(null);
        router.refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Could not save categories.");
    }
    finally {
        setBusy(false);
    } }
    return (
        <div className="admin-overview-content admin-categories">
            <header className="admin-overview-head admin-category-heading">
                <div className="eyebrow">CATALOGUE ORGANISATION</div>
                <h1>Categories</h1>
                <p>Name your collections and choose the order customers see them.</p>
            </header>
            {error && <div role="alert" className="admin-category-error"><p>{error}</p><button type="button" className="button button-outline button-small" onClick={() => window.location.reload()}>Refresh categories</button></div>}
            {groups.map(group => (
                <section className="admin-category-panel" key={group.group} aria-labelledby={`categories-${group.group}`}>
                    <div className="admin-category-panel-heading">
                        <div>
                            <h2 id={`categories-${group.group}`}>{group.group === "products" ? "Product categories" : "Gallery categories"}</h2>
                            <p>{group.group === "products" ? "Shown in product editors and storefront filters." : "Shown in gallery editors and public gallery filters."}</p>
                        </div>
                        <span>{group.entries.length} {group.entries.length === 1 ? "category" : "categories"}</span>
                    </div>
                    <form className="admin-category-add" onSubmit={e => { e.preventDefault(); void save(group, { type: "create", id: "new", label: names[group.group] || "" }); }}>
                        <label htmlFor={`new-category-${group.group}`}>New category
                            <input id={`new-category-${group.group}`} required maxLength={80} placeholder={group.group === "products" ? "e.g. Hair accessories" : "e.g. Bridal styling"} disabled={busy} value={names[group.group] || ""} onChange={e => setNames(v => ({ ...v, [group.group]: e.target.value }))} />
                        </label>
                        <button type="submit" className="button button-primary button-small" disabled={busy || !names[group.group]?.trim()}>Add category</button>
                    </form>
                    {group.entries.length === 0 && <p className="admin-category-empty">No categories yet. Add your first category above.</p>}
                    <ol className="admin-category-list">
                        {group.entries.map((entry, index) => {
                            const key = entry.id + group.group;
                            const value = names[key] ?? entry.label;
                            return (
                                <li key={entry.id}>
                                    <span className="admin-category-position" aria-label={`Position ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                                    <form className="admin-category-rename" onSubmit={e => { e.preventDefault(); void save(group, { type: "rename", id: entry.id, label: value }); }}>
                                        <input aria-label={`Category name: ${entry.label}`} maxLength={80} required disabled={busy} value={value} onChange={e => setNames(v => ({ ...v, [key]: e.target.value }))} />
                                        <button type="submit" className="button button-outline button-small" disabled={busy || value.trim() === entry.label || !value.trim()}>Save</button>
                                    </form>
                                    <div className="admin-category-controls">
                                        <div className="admin-category-order" role="group" aria-label={`Reorder ${entry.label}`}>
                                            {[-1, 1].map(offset => (
                                                <button className="button button-outline button-small admin-category-move" type="button" key={offset} disabled={busy || index + offset < 0 || index + offset >= group.entries.length} aria-label={`Move ${entry.label} ${offset < 0 ? "up" : "down"}`} title={offset < 0 ? "Move up" : "Move down"} onClick={() => {
                                                    const ids = group.entries.map(e => e.id);
                                                    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
                                                    void save(group, { type: "reorder", ids });
                                                }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={offset < 0 ? "M12 19V5m-6 6 6-6 6 6" : "M12 5v14m-6-6 6 6 6-6"} /></svg>
                                                </button>
                                            ))}
                                        </div>
                                        {role === "owner" && <button type="button" className="button button-outline button-small admin-category-delete" disabled={busy} aria-expanded={confirmDelete === key} onClick={() => setConfirmDelete(confirmDelete === key ? null : key)}>Delete</button>}
                                    </div>
                                    {confirmDelete === key && role === "owner" && (
                                        <div className="admin-category-confirm">
                                            <p>Delete <strong>{entry.label}</strong>? Categories with assigned items cannot be deleted.</p>
                                            <div><button type="button" className="button button-outline button-small" disabled={busy} onClick={() => setConfirmDelete(null)}>Cancel</button><button type="button" className="button button-primary button-small" disabled={busy} onClick={() => void save(group, { type: "delete", id: entry.id })}>{busy ? "Deleting?" : "Delete category"}</button></div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                    <p className="admin-category-help">Use the arrows to change the display order. Save a name after editing it.{role === "owner" ? " Reassign items before deleting a category." : " Only owners can delete categories."}</p>
                </section>
            ))}
        </div>
    );
}

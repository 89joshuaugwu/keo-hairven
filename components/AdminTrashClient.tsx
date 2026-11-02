"use client";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminRole } from "@/components/AdminRoleProvider";
import { AdminTrashActions } from "@/components/AdminTrashActions";
import { adminFetch } from "@/lib/admin-client";
import type { TrashKind } from "@/lib/trash-shared";
type Item = {
    kind: TrashKind;
    id: string;
    title: string;
    revision: number;
    purgeAt?: number | null;
    purgeState?: string | null;
};
export function AdminTrashClient({ initial }: {
    initial: Item[];
}) {
    const [items, setItems] = useState(initial);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmRetention, setConfirmRetention] = useState(false);
    const role = useAdminRole();
    const router = useRouter();
    async function refresh() { const r = await adminFetch("/api/admin/trash"); if (!r.ok)
        throw Error("Could not refresh Trash."); setItems((await r.json()).items); router.refresh(); }
    async function migrate() { setBusy(true); try {
        let remaining = true;
        let total = 0;
        while (remaining) {
            const r = await adminFetch("/api/admin/trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "migrate" }) });
            const d = await r.json();
            if (!r.ok)
                throw Error(d.message);
            total += d.migrated;
            remaining = d.remaining;
        }
        setMessage(`Retention started for ${total} items.`);
        await refresh();
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : "Migration failed.");
    }
    finally {
        setBusy(false);
    } }
    const legacyCount = items.filter(item => !item.purgeAt).length;
    const labels: Record<TrashKind, string> = {
        products: "Product", services: "Service", looks: "Gallery look", faqs: "FAQ", media: "Media",
    };
    return (
        <div className="admin-overview-content admin-trash-page">
            <AdminConfirmDialog open={confirmRetention} title="Start the 24-hour countdown?" description="Older items in Trash will get a fresh 24-hour recovery window. After that, scheduled cleanup can delete them permanently. You can still restore them before cleanup starts." confirmLabel="Start countdown" onCancel={() => setConfirmRetention(false)} onConfirm={() => { setConfirmRetention(false); void migrate(); }} />
            <header className="admin-overview-head admin-trash-header">
                <div>
                    <div className="eyebrow">CONTENT RECOVERY</div>
                    <h1>Trash</h1>
                    <p>Restore removed items within 24 hours, or delete them permanently.</p>
                </div>
                <span className="admin-trash-total">{items.length} {items.length === 1 ? "item" : "items"}</span>
            </header>
            <p className="admin-trash-note">Expired items remain here until scheduled cleanup runs. Images still used elsewhere are protected.</p>
            {role === "owner" && legacyCount > 0 && (
                <section className="admin-trash-retention" aria-label="Existing trash retention">
                    <div>
                        <h2>Start the recovery window</h2>
                        <p>{legacyCount} {legacyCount === 1 ? "older item has" : "older items have"} no countdown yet. Give them a fresh 24 hours before cleanup.</p>
                    </div>
                    <button type="button" className="button button-outline button-small" disabled={busy} onClick={() => setConfirmRetention(true)}>
                        {busy ? "Starting recovery window?" : "Start 24-hour countdown"}
                    </button>
                </section>
            )}
            {message && <p className="admin-trash-message" role="status">{message}</p>}
            {items.length === 0 ? (
                <section className="admin-trash-empty">
                    <h2>Trash is empty</h2>
                    <p>Items you remove will appear here with time to restore them.</p>
                </section>
            ) : (
                <ul className="admin-trash-list" aria-label="Removed items">
                    {items.map(item => (
                        <li className="admin-trash-row" key={`${item.kind}-${item.id}`}>
                            <div className="admin-trash-item">
                                <span className="admin-trash-kind">{labels[item.kind]}</span>
                                <h2>{item.title}</h2>
                            </div>
                            <AdminTrashActions {...item} onChange={() => void refresh().catch(e => setMessage(e.message))} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

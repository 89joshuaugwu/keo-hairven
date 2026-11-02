"use client";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { useAdminRole } from "@/components/AdminRoleProvider";
import { TrashCountdown } from "@/components/TrashCountdown";
import type { TrashKind } from "@/lib/trash-shared";
export function AdminTrashActions({ kind, id, revision, purgeAt, purgeState, onChange }: {
    kind: TrashKind;
    id: string;
    revision: number;
    purgeAt?: number | null;
    purgeState?: string | null;
    onChange?: () => void;
}) {
    const role = useAdminRole();
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState("");
    async function action(name: string) { setBusy(true); setError(""); try {
        const r = await adminFetch("/api/admin/trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, action: name, expectedRevision: revision }) });
        const data = await r.json();
        if (!r.ok)
            throw Error(data.message);
        if (onChange)
            onChange();
        else
            window.location.reload();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
    }
    finally {
        setBusy(false);
    } }
    return <div className="admin-trash-actions"><AdminConfirmDialog open={confirmDelete} title="Delete this item forever?" description="This permanently removes the item from Trash. You will not be able to restore it. Media still used by another item is protected." confirmLabel="Delete forever" destructive onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); void action("purge"); }} /><TrashCountdown purgeAt={purgeAt} purgeState={purgeState}/><div><button type="button" className="button button-outline button-small" disabled={busy} onClick={() => void action("restore")}>Restore</button>{role === "owner" && <button type="button" className="button button-outline button-small is-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete forever</button>}</div>{error && <p role="alert">{error}</p>}</div>;
}

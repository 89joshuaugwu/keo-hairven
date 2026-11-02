"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export function AdminConfirmDialog({ open, title, description, confirmLabel, destructive = false, error, busy = false, onCancel, onConfirm }: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    error?: string;
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            dialog?.close();
            if (previous?.isConnected) previous.focus();
        };
    }, [open]);
    if (!open) return null;
    return createPortal(
        <dialog ref={dialogRef} className="admin-confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => { if (event.target === dialogRef.current) { const bounds = dialogRef.current.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel(); } }}>
            <div className="eyebrow">{destructive ? "PERMANENT DELETION" : "RECOVERY WINDOW"}</div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
            {error && <p role="alert" className="admin-feedback is-error">{error}</p>}
            <div className="admin-confirm-buttons">
                <button type="button" className="button button-outline" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
                <button type="button" className={`button button-primary${destructive ? " is-destructive" : ""}`} disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
            </div>
        </dialog>, document.body,
    );
}

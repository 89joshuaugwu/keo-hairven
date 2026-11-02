import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, FieldPath, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { destroyCloudinaryAsset } from "@/lib/cloudinary-admin";
import { expiryFor, type TrashKind } from "@/lib/trash-shared";
const projections: Partial<Record<TrashKind, string>> = { products: "publicProducts", services: "publicServices", looks: "publicLooks", faqs: "publicFaqs" };
export function millis(v: any): number | undefined { return typeof v === "number" ? v : typeof v?.toMillis === "function" ? v.toMillis() : undefined; }
async function mediaIsReferenced(tx: Transaction, id: string, raw: Record<string, any>) {
    const db = getAdminDb()!;
    for (const kind of ["products", "services", "looks"]) {
        if (!(await tx.get(db.collection(kind).where("mediaIds", "array-contains", id).limit(1))).empty)
            return true;
    }
    // Public projections historically store URLs rather than IDs. Fail closed on read errors.
    for (const name of ["publicProducts", "publicServices", "publicLooks"]) {
        const snap = await tx.get(db.collection(name));
        if (snap.docs.some(d => (d.data().mediaIds || []).includes(id) || (Array.isArray(d.data().media) ? d.data().media : d.data().media ? [d.data().media] : []).some((m: any) => m.id === id || m.src === raw.secureUrl)))
            return true;
    }
    const draft = await tx.get(db.collection("settingsDrafts").doc("site"));
    const live = await tx.get(db.collection("publicSettings").doc("site"));
    const a = draft.data() || {};
    const b = live.data()?.content || {};
    return [a.homeHeroMediaId, a.aboutMediaId, b.homeHeroMedia?.id, b.aboutMedia?.id].includes(id) || [b.homeHeroMedia?.src, b.aboutMedia?.src].some(v => v && v === raw.secureUrl);
}
function audit(tx: Transaction, actor: string, action: string, id: string) { tx.set(getAdminDb()!.collection("adminAudit").doc(), { actor, action, entityId: id, createdAt: FieldValue.serverTimestamp() }); }
function checkRevision(raw: Record<string, any>, expectedRevision?: number) { if (expectedRevision !== undefined && raw.revision !== expectedRevision)
    throw Error("This item changed. Refresh and try again."); }
export async function trashRecord(kind: TrashKind, id: string, expectedRevision: number | undefined, actor: string) {
    const db = getAdminDb();
    if (!db)
        throw Error("Database unavailable.");
    const ref = db.collection(kind).doc(id);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw Error("Item not found.");
        const raw = snap.data()!;
        checkRevision(raw, expectedRevision);
        if (raw.purgeClaim)
            throw Error("Cleanup has already started.");
        if (raw.status === "trashed")
            return { revision: raw.revision };
        if (kind === "media" && await mediaIsReferenced(tx, id, raw))
            throw Error("This media is still used. Remove or replace its references first.");
        const now = Date.now();
        const revision = (raw.revision || 0) + 1;
        tx.update(ref, { status: "trashed", deletedAt: Timestamp.fromMillis(now), purgeAt: Timestamp.fromMillis(expiryFor(now)), updatedAt: FieldValue.serverTimestamp(), revision, ...(["looks", "services"].includes(kind) ? { suppressStarterPublic: true } : {}) });
        if (projections[kind])
            tx.delete(db.collection(projections[kind]!).doc(id));
        audit(tx, actor, `${kind}.trash`, id);
        return { revision };
    });
}
export async function restoreRecord(kind: TrashKind, id: string, expectedRevision: number | undefined, actor: string) {
    const db = getAdminDb();
    if (!db)
        throw Error("Database unavailable.");
    const ref = db.collection(kind).doc(id);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw Error("Item not found.");
        const raw = snap.data()!;
        checkRevision(raw, expectedRevision);
        if (raw.purgeClaim)
            throw Error("Cleanup has already started. Refresh to see the result.");
        if (raw.status !== "trashed")
            throw Error("This item is not in Trash.");
        const revision = (raw.revision || 0) + 1;
        tx.update(ref, { status: kind === "media" ? "active" : "draft", deletedAt: FieldValue.delete(), purgeAt: FieldValue.delete(), purgeState: FieldValue.delete(), revision, updatedAt: FieldValue.serverTimestamp() });
        audit(tx, actor, `${kind}.restore`, id);
        return { revision };
    });
}
export async function purgeRecord(kind: TrashKind, id: string, options: {
    actor: string;
    expectedRevision?: number;
    onlyExpired: boolean;
}): Promise<"deleted" | "blocked" | "failed" | "skipped"> {
    const db = getAdminDb();
    if (!db)
        throw Error("Database unavailable.");
    const ref = db.collection(kind).doc(id);
    const token = randomUUID();
    let media: Record<string, any> | undefined;
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            return "skipped" as const;
        const raw = snap.data()!;
        checkRevision(raw, options.expectedRevision);
        if (raw.status !== "trashed")
            return "skipped" as const;
        if (options.onlyExpired && (!millis(raw.purgeAt) || millis(raw.purgeAt)! > Date.now()))
            return "skipped" as const;
        if (raw.purgeClaim && millis(raw.purgeClaim.until)! > Date.now())
            return "skipped" as const;
        if (kind === "media") {
            if (await mediaIsReferenced(tx, id, raw)) {
                tx.update(ref, { purgeState: "blocked" });
                return "blocked" as const;
            }
            media = raw;
            tx.update(ref, { purgeClaim: { token, until: Timestamp.fromMillis(Date.now() + 600000) }, purgeState: "claimed" });
            return "claimed" as const;
        }
        if (raw.sourceStarterId || raw.suppressStarterPublic || raw.importedFromCurrentSite)
            tx.set(db.collection("starterSuppressions").doc(`${kind}-${raw.sourceStarterId || id}`), { kind, sourceStarterId: raw.sourceStarterId || id, createdAt: FieldValue.serverTimestamp() });
        if (projections[kind])
            tx.delete(db.collection(projections[kind]!).doc(id));
        tx.delete(ref);
        audit(tx, options.actor, `${kind}.purge`, id);
        return "deleted" as const;
    });
    if (result !== "claimed")
        return result;
    if (media?.publicId) {
        const removed = await destroyCloudinaryAsset(media.publicId, media.resourceType);
        if (!removed.ok) {
            await db.runTransaction(async (tx) => { const s = await tx.get(ref); if (s.data()?.purgeClaim?.token === token)
                tx.update(ref, { purgeClaim: FieldValue.delete(), purgeState: "failed" }); });
            return "failed";
        }
    }
    return db.runTransaction(async (tx) => { const s = await tx.get(ref); if (s.data()?.purgeClaim?.token !== token)
        return "skipped" as const; tx.set(db.collection("starterSuppressions").doc(`media-${id}`), { kind: "media", sourceStarterId: id, createdAt: FieldValue.serverTimestamp() }); tx.delete(ref); audit(tx, options.actor, "media.purge", id); return "deleted" as const; });
}
export async function getTrashRecords() { const db = getAdminDb(); if (!db)
    return []; const items: Record<string, any>[] = []; for (const kind of ["products", "services", "looks", "faqs", "media"] as TrashKind[]) {
    const s = await db.collection(kind).where("status", "==", "trashed").get();
    for (const d of s.docs) {
        const r = d.data();
        items.push({ kind, id: d.id, title: r.title || r.question || r.label || r.originalFilename || "Untitled item", revision: r.revision || 1, purgeAt: millis(r.purgeAt) || null, purgeState: r.purgeState || null });
    }
} return items; }
export async function migrateLegacyTrash(actor: string) {
    const db = getAdminDb();
    if (!db)
        throw Error("Database unavailable.");
    const kinds: TrashKind[] = ["products", "services", "looks", "faqs", "media"];
    const cursorRef = db.collection("trashMigrationCursors").doc("current");
    const saved = (await cursorRef.get()).data();
    let group = Number(saved?.group) || 0;
    let cursor = typeof saved?.id === "string" ? saved.id : undefined;
    let inspected = 0;
    let migrated = 0;
    while (group < kinds.length && inspected < 100) {
        const kind = kinds[group];
        const pageSize = 100 - inspected;
        let query = db.collection(kind).where("status", "==", "trashed").orderBy(FieldPath.documentId()).limit(100 - inspected);
        if (cursor)
            query = query.startAfter(cursor);
        const page = await query.get();
        for (const doc of page.docs) {
            const changed = await db.runTransaction(async (tx) => { const current = await tx.get(doc.ref); if (current.data()?.status !== "trashed" || current.data()?.purgeAt)
                return false; tx.update(doc.ref, { purgeAt: Timestamp.fromMillis(expiryFor(Date.now())) }); audit(tx, actor, `${kind}.retention-start`, doc.id); return true; });
            if (changed)
                migrated++;
            inspected++;
            cursor = doc.id;
        }
        if (page.docs.length < pageSize) {
            group++;
            cursor = undefined;
        }
    }
    const remaining = group < kinds.length;
    if (remaining)
        await cursorRef.set({ group, id: cursor || null });
    else
        await cursorRef.delete();
    return { migrated, remaining };
}

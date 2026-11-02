import {getStarterMediaLibrary} from "@/lib/admin-media";
import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue, type Transaction, type DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { defaultCategories, changeCategories, type CategoryGroup, type CategoryRegistry, type CategoryOperation } from "@/lib/category-shared";
export async function getCategoryRegistry(group: CategoryGroup): Promise<CategoryRegistry> {
    const db = getAdminDb();
    if (!db)
        return { group, revision: 0, entries: defaultCategories[group] };
    const snap = await db.collection("categoryRegistries").doc(group).get();
    return snap.exists ? { group, revision: snap.data()!.revision, entries: snap.data()!.entries } : { group, revision: 0, entries: defaultCategories[group] };
}
export async function validateCategoryAssignment(tx: Transaction, group: CategoryGroup, category: string) {
    const db = getAdminDb()!;
    const snap = await tx.get(db.collection("categoryRegistries").doc(group));
    const entries = snap.exists ? snap.data()!.entries : defaultCategories[group];
    if (!category || !entries.some((e: {
        id: string;
    }) => e.id === category))
        throw Error("Choose an existing category. Refresh the editor if categories changed.");
}
export async function validateMediaAssignment(tx: Transaction, ids: string[], allowBundled = false) {
    const db = getAdminDb()!;
    for (const id of ids) {
        const s = await tx.get(db.collection("media").doc(id));
        if(!s.exists){const marker=await tx.get(db.collection("starterSuppressions").doc(`media-${id}`));if(!allowBundled||marker.exists||!getStarterMediaLibrary().some(m=>m.id===id))throw Error("Selected media no longer exists. Choose active media.");}
        if (s.exists && (s.data()!.status === "trashed" || s.data()!.purgeClaim))
            throw Error("Selected media is in Trash or being deleted. Choose active media.");
    }
}
export async function writeCategorized(ref: DocumentReference, data: Record<string, any>, group: CategoryGroup) {
    const db = getAdminDb()!;
    await db.runTransaction(async (tx) => { await validateCategoryAssignment(tx, group, data.category); await validateMediaAssignment(tx, data.mediaIds || []); tx.set(ref, data); });
}
export async function mutateCategoryRegistry(group: CategoryGroup, expectedRevision: number, operation: CategoryOperation, actor: {
    role?: string;
    email?: string;
}) {
    const db = getAdminDb();
    if (!db)
        throw Error("Database unavailable.");
    if (operation.type === "delete" && actor.role !== "owner")
        throw Error("Only the owner can delete categories.");
    if (operation.type === "create")
        operation = { ...operation, id: randomUUID() };
    const ref = db.collection("categoryRegistries").doc(group);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current: CategoryRegistry = snap.exists ? { group, ...snap.data() } as CategoryRegistry : { group, revision: 0, entries: defaultCategories[group] };
        if (current.revision !== expectedRevision)
            throw Error("Categories changed. Refresh and try again.");
        if (operation.type === "delete") {
            const collections = group === "products" ? ["products", "publicProducts"] : ["looks", "publicLooks"];
            for (const name of collections) {
                const assigned = await tx.get(db.collection(name).where("category", "==", operation.id).limit(1));
                if (!assigned.empty)
                    throw Error("This category has assigned items, including drafts or trash. Reassign or delete those items first.");
            }
        }
        const next = { group, revision: current.revision + 1, entries: changeCategories(current.entries, operation) };
        tx.set(ref, next);
        tx.set(db.collection("adminAudit").doc(), { actor: actor.email || "admin", action: `category.${operation.type}`, entityId: group, createdAt: FieldValue.serverTimestamp() });
        return next;
    });
}
export async function commitContentBatch(kind: "products" | "looks" | "services", id: string, revision: number, mediaIds: string[], write: (tx: Transaction) => void) {
    const db = getAdminDb()!;
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(db.collection(kind).doc(id));
        const raw = snap.data();
        if (!raw || raw.revision !== revision || raw.status === "trashed" || raw.purgeClaim)
            throw Error("Item changed or is in Trash. Refresh before publishing.");
        if (kind !== "services")
            await validateCategoryAssignment(tx, kind === "products" ? "products" : "gallery", raw.category);
        await validateMediaAssignment(tx, mediaIds);
        write(tx);
    });
}
export async function getStarterSuppressions(kind: string) { const db = getAdminDb(); if (!db)
    return new Set<string>(); const s = await db.collection("starterSuppressions").where("kind", "==", kind).get(); return new Set(s.docs.map(d => String(d.data().sourceStarterId))); }
export async function writeImported(ref: DocumentReference, data: Record<string, any>, kind: string, expectedRevision: number, sourceId: string, projectionCollection?: string, projection?: Record<string, any>) {
    const db = getAdminDb()!;
    return db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        const raw = existing.data();
        const suppressed = await tx.get(db.collection("starterSuppressions").doc(`${kind}-${sourceId}`));
        if (suppressed.exists || raw?.status === "trashed" || raw?.purgeClaim || (raw?.revision || 0) !== expectedRevision)
            return false;
        if (kind === "products" || kind === "looks")
            await validateCategoryAssignment(tx, kind === "products" ? "products" : "gallery", data.category);
        await validateMediaAssignment(tx, data.mediaIds || []);
        tx.set(ref, data, { merge: true });
        if (projectionCollection && projection)
            tx.set(db.collection(projectionCollection).doc(ref.id), projection);
        return true;
    });
}

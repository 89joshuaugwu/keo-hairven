import "server-only";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { purgeRecord, millis } from "@/lib/trash-server";
import type { TrashKind } from "@/lib/trash-shared";
export async function runTrashCleanup() {
    const db = getAdminDb();
    if (!db)
        throw Error("Database unavailable.");
    const counts = { deleted: 0, blocked: 0, failed: 0, skipped: 0 };
    for (const kind of ["products", "services", "looks", "faqs", "media"] as TrashKind[]) {
        const cursorRef = db.collection("trashCleanupCursors").doc(kind);
        const saved = (await cursorRef.get()).data();
        let q = db.collection(kind).where("purgeAt", "<=", Timestamp.now()).orderBy("purgeAt").orderBy(FieldPath.documentId()).limit(20);
        if (saved?.purgeAt && saved.id)
            q = q.startAfter(saved.purgeAt, saved.id);
        let snap = await q.get();
        if (snap.empty && saved?.id) {
            await cursorRef.delete();
            continue;
        }
        for (const d of snap.docs) {
            try {
                counts[await purgeRecord(kind, d.id, { actor: "scheduled-cleanup", onlyExpired: true })]++;
            }
            catch {
                counts.failed++;
            }
        }
        const last = snap.docs.at(-1);
        if (last)
            await cursorRef.set({ purgeAt: Timestamp.fromMillis(millis(last.data().purgeAt)!), id: last.id });
    }
    return counts;
}

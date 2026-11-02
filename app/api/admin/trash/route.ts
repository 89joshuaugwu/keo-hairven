import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getTrashRecords, migrateLegacyTrash, restoreRecord, purgeRecord } from "@/lib/trash-server";
import type { TrashKind } from "@/lib/trash-shared";
export const runtime = "nodejs";
export async function GET(request: NextRequest) { const a = await requireAdminApi(request); if ("response" in a)
    return a.response; return noStoreJson({ items: await getTrashRecords() }); }
export async function POST(request: NextRequest) {
    const a = await requireAdminApi(request, true);
    if ("response" in a)
        return a.response;
    try {
        const b = await request.json();
        const actor = a.session.email || "admin";
        if (b.action === "migrate") {
            if (a.session.role !== "owner")
                return noStoreJson({ message: "Owner access required." }, { status: 403 });
            return noStoreJson(await migrateLegacyTrash(actor));
        }
        if (!["products", "services", "looks", "faqs", "media"].includes(b.kind) || typeof b.id !== "string" || b.id.includes("/") || !b.id || !Number.isInteger(b.expectedRevision))
            throw Error("Invalid request.");
        if (b.action === "restore")
            return noStoreJson({ ok: true, ...await restoreRecord(b.kind as TrashKind, b.id, b.expectedRevision, actor) });
        if (b.action !== "purge")
            throw Error("Unknown action.");
        if (a.session.role !== "owner")
            return noStoreJson({ message: "Owner access required." }, { status: 403 });
        const result = await purgeRecord(b.kind, b.id, { actor, expectedRevision: b.expectedRevision, onlyExpired: false });
        if (result !== "deleted")
            throw Error(result === "blocked" ? "This media is still referenced. Remove its references first." : "Deletion is pending or failed. Refresh and try again.");
        return noStoreJson({ ok: true });
    }
    catch (e) {
        return noStoreJson({ message: e instanceof Error ? e.message : "Trash action failed." }, { status: 409 });
    }
}

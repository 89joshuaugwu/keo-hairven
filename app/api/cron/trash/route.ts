import { timingSafeEqual } from "node:crypto";
import { runTrashCleanup } from "@/lib/trash-cleanup";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { const secret = process.env.TRASH_CRON_SECRET; if (!secret)
    return Response.json({ message: "Cleanup is not configured." }, { status: 503 }); const token = request.headers.get("authorization") || ""; const expected = `Bearer ${secret}`; if (Buffer.byteLength(token) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected)))
    return Response.json({ message: "Unauthorised." }, { status: 401 }); try {
    return Response.json(await runTrashCleanup(), { headers: { "Cache-Control": "no-store" } });
}
catch {
    return Response.json({ message: "Cleanup failed. Retry on the next scheduled run." }, { status: 503 });
} }

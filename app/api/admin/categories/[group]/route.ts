import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getCategoryRegistry, mutateCategoryRegistry } from "@/lib/categories-server";
import type { CategoryOperation } from "@/lib/category-shared";
export const runtime = "nodejs";
export async function GET(request: NextRequest, ctx: {
    params: Promise<{
        group: string;
    }>;
}) {
    const auth = await requireAdminApi(request);
    if ("response" in auth)
        return auth.response;
    const { group } = await ctx.params;
    if (group !== "products" && group !== "gallery")
        return noStoreJson({ message: "Unknown group." }, { status: 404 });
    return noStoreJson(await getCategoryRegistry(group));
}
export async function POST(request: NextRequest, ctx: {
    params: Promise<{
        group: string;
    }>;
}) {
    const auth = await requireAdminApi(request, true);
    if ("response" in auth)
        return auth.response;
    const { group } = await ctx.params;
    if (group !== "products" && group !== "gallery")
        return noStoreJson({ message: "Unknown group." }, { status: 404 });
    try {
        const body = await request.json();
        if (!Number.isInteger(body.expectedRevision) || !["create", "rename", "reorder", "delete"].includes(body.operation?.type))
            throw Error("Invalid category request.");
        const registry = await mutateCategoryRegistry(group, body.expectedRevision, body.operation as CategoryOperation, auth.session);
        revalidatePath("/", "layout");
        return noStoreJson(registry);
    }
    catch (e) {
        return noStoreJson({ message: e instanceof Error ? e.message : "Categories could not be saved." }, { status: e instanceof Error && e.message.includes("Only the owner") ? 403 : 409 });
    }
}

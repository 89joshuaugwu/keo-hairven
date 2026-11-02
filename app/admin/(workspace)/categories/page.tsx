import { AdminCategoriesClient } from "@/components/AdminCategoriesClient";
import { getCategoryRegistry } from "@/lib/categories-server";
import { getVerifiedAdminSession } from "@/lib/admin-session";
export const dynamic = "force-dynamic";
export default async function CategoriesPage() { const [products, gallery, session] = await Promise.all([getCategoryRegistry("products"), getCategoryRegistry("gallery"), getVerifiedAdminSession()]); return <AdminCategoriesClient initial={[products, gallery]} role={session?.role || "editor"}/>; }

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAiManager } from "@/components/AdminAiManager";
import { getAdminAiSettings } from "@/lib/admin-ai";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "AI assistant", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const session = await getVerifiedAdminSession();
  if (!session?.role) redirect("/admin/login");
  if (session.role !== "owner") redirect("/admin");
  const settings = adminClientSafe(await getAdminAiSettings());
  return <AdminAiManager initialSettings={settings} />;
}
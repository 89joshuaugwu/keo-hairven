import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminBusinessDetailsClient } from "@/components/AdminBusinessDetailsClient";
import { getAdminBusinessSettings } from "@/lib/admin-business";
import { getSiteSetupStatus } from "@/lib/site-setup";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Business details", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailsPage() {
  const session = await getVerifiedAdminSession();
  if (!session?.role) redirect("/admin/login");
  const [settings, setupStatus] = adminClientSafe(await Promise.all([getAdminBusinessSettings(), getSiteSetupStatus()]));
  return <AdminBusinessDetailsClient initialSettings={settings} role={session.role} initialSetupStatus={setupStatus} />;
}
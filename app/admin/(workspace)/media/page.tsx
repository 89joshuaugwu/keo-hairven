import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminMediaLibraryClient } from "@/components/AdminMediaLibraryClient";
import { getAdminMediaLibrary } from "@/lib/admin-media";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Media library — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const session = await getVerifiedAdminSession();
  if (!session?.role) redirect("/admin/login");
  const media = adminClientSafe(await getAdminMediaLibrary(true));
  return <AdminMediaLibraryClient initialMedia={media} role={session.role} />;
}
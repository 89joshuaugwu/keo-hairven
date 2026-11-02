import type { Metadata } from "next";
import { AdminGalleryClient } from "@/components/AdminGalleryClient";
import { getAdminLooks } from "@/lib/admin-looks";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Gallery — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const looks = adminClientSafe(await getAdminLooks());
  return <AdminGalleryClient initialLooks={looks} />;
}
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminLookEditor } from "@/components/AdminLookEditor";
import { getAdminLook, getAdminLookMedia, starterLookMedia } from "@/lib/admin-looks";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Edit gallery look — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminEditLookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const look = adminClientSafe(await getAdminLook(id));
  if (!look || look.preview) notFound();
  const media = adminClientSafe(await getAdminLookMedia(look.mediaIds));
  return <AdminLookEditor initialLook={look} initialMedia={media} starterFallbackMedia={adminClientSafe(look.sourceStarterId ? starterLookMedia(look.sourceStarterId) : [])} isNew={false} />;
}
import type { Metadata } from "next";
import { AdminContentEditor } from "@/components/AdminContentEditor";
import { getAdminContentBundle } from "@/lib/admin-content";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Website content", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const bundle = adminClientSafe(await getAdminContentBundle());
  return <AdminContentEditor initialContent={bundle.content} initialFaqs={bundle.faqs} initialTrashedFaqs={bundle.trashedFaqs} media={bundle.media} />;
}
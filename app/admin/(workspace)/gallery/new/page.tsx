import type { Metadata } from "next";
import { AdminLookEditor } from "@/components/AdminLookEditor";
import { starterLookById, starterLookMedia, type AdminLookRecord } from "@/lib/admin-looks";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Add gallery look — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const blankLook: AdminLookRecord = {
  id: "new",
  reference: "",
  slug: "look",
  title: "",
  category: "",
  caption: "",
  mediaIds: [],
  provenance: "real-work",
  generated: false,
  clientPermission: false,
  priceMode: "quote",
  status: "draft",
  revision: 0,
};

export default async function AdminNewLookPage({ searchParams }: { searchParams: Promise<{ starter?: string }> }) {
  const { starter } = await searchParams;
  const initial = adminClientSafe(starter ? starterLookById(starter) || blankLook : blankLook);
  return <AdminLookEditor initialLook={initial} initialMedia={[]} starterFallbackMedia={adminClientSafe(starter ? starterLookMedia(starter) : [])} isNew />;
}
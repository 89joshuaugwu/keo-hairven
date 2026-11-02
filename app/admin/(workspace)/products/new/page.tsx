import type { Metadata } from "next";
import { AdminProductEditor } from "@/components/AdminProductEditor";
import { starterProductById, type AdminProductRecord } from "@/lib/admin-products";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Add product — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const blankProduct: AdminProductRecord = {
  id: "new",
  slug: "product",
  title: "",
  category: "",
  description: "",
  priceMode: "quote",
  currency: "NGN",
  availability: "confirm",
  mediaIds: [],
  variants: [],
  status: "draft",
  ownerConfirmed: false,
  revision: 0,
};

export default async function AdminNewProductPage({ searchParams }: { searchParams: Promise<{ starter?: string }> }) {
  const { starter } = await searchParams;
  const initial = adminClientSafe(starter ? starterProductById(starter) || blankProduct : blankProduct);
  return <AdminProductEditor initialProduct={initial} initialMedia={[]} starterFallbackImage={starter ? "/assets/campaign/hair-collection.webp" : undefined} isNew />;
}
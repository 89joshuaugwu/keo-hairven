import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProductEditor } from "@/components/AdminProductEditor";
import { getAdminMedia, getAdminProduct } from "@/lib/admin-products";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Edit product — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = adminClientSafe(await getAdminProduct(id));
  if (!product || product.preview) notFound();
  const media = adminClientSafe(await getAdminMedia(product.mediaIds));
  return <AdminProductEditor initialProduct={product} initialMedia={media} isNew={false} />;
}
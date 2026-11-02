import type { Metadata } from "next";
import { AdminProductsClient } from "@/components/AdminProductsClient";
import { getAdminProducts } from "@/lib/admin-products";
import { adminClientSafe } from "@/lib/admin-serialise";

export const metadata: Metadata = { title: "Products — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = adminClientSafe(await getAdminProducts());
  return <AdminProductsClient initialProducts={products} />;
}
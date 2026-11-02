import { ProductSkeleton } from "@/components/ProductExplorer";

export default function Loading() {
  return (
    <main className="section product-route-loading" aria-busy="true">
      <div className="eyebrow">THE COLLECTION</div>
      <ProductSkeleton />
    </main>
  );
}

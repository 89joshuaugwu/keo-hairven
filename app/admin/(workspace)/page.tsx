import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminOverviewContent, AdminOverviewSkeleton } from "@/components/AdminOverviewContent";

export const metadata: Metadata = {
  title: "Admin overview",
  description: "Private KEO Hairven admin overview.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<AdminOverviewSkeleton />}>
      <AdminOverviewContent />
    </Suspense>
  );
}

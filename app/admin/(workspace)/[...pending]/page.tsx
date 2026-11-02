import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVerifiedAdminSession } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin workspace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const pendingSections: Record<string, string> = {
  products: "Products",
  gallery: "Gallery",
  services: "Services",
  media: "Media library",
  content: "Website content",
  settings: "Business details",
  ai: "AI assistant",
};

export default async function PendingAdminSection({ params }: { params: Promise<{ pending: string[] }> }) {
  const session = await getVerifiedAdminSession();
  if (!session?.role) redirect("/admin/login");

  const { pending } = await params;
  const section = pending[0];
  const label = pendingSections[section];
  if (!label) notFound();
  if (section === "ai" && session.role !== "owner") notFound();

  const detail = pending.length > 1 ? pending.slice(1).join(" / ") : "";

  return (
    <main className="admin-pending-content">
      <div className="eyebrow">ADMIN WORKSPACE</div>
      <h1>{label}{detail ? <><br /><em>{detail.replaceAll("-", " ")}</em></> : null}</h1>
      <p>This protected destination is reserved for the KEO Hairven admin workspace. No content has been changed.</p>
      <Link href="/admin" className="button button-outline">← Back to overview</Link>
    </main>
  );
}

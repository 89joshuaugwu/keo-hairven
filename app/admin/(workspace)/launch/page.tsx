import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { launchChecks } from "@/lib/launch-checks";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { getBrowseProductsServer } from "@/lib/public-products-server";
import { getAdminAiSettings } from "@/lib/admin-ai";
export const metadata: Metadata = { title: "Launch checklist", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function LaunchPage() {
  const session = await getVerifiedAdminSession();
  if (!session?.role) redirect("/admin/login");
  if (session.role !== "owner") redirect("/admin");
  const checks = launchChecks(process.env);
  const [business, products, ai] = await Promise.all([getPublicBusinessServer(), getBrowseProductsServer(false), getAdminAiSettings()]);
  const ready = checks.filter(check => check.ready).length;
  const managedAi = ai.connections.some(connection => connection.enabled && connection.status === "connected");
  return <main className="admin-launch-content"><header className="studio-page-heading"><div><span className="eyebrow">YOUR STORE, READY FOR ITS NEXT CHAPTER</span><h1>Ready when <em>you are.</em></h1><p>A practical checklist for your own KEO Hairven deployment.</p></div><a href="/" target="_blank" rel="noopener noreferrer" className="button button-outline">Preview website ↗</a></header>
    <div className="launch-summary"><div><span className="eyebrow">ENVIRONMENT CHECK</span><strong>{ready}<small> / {checks.length}</small></strong></div><p>These checks confirm configuration is present, not that a provider is connected. Complete the live checks below before accepting enquiries.</p></div>
    <section className="launch-content-checks" aria-label="Published content"><Link href="/admin/settings"><span className={`studio-status ${business.published && business.whatsappDigits ? "is-ready" : ""}`}>{business.published && business.whatsappDigits ? "Published" : "Needs attention"}</span><h2>Business details</h2><p>Publish a verified WhatsApp number, location and delivery note.</p><span aria-hidden="true">↗</span></Link><Link href="/admin/products"><span className={`studio-status ${products.length ? "is-ready" : ""}`}>{products.length ? `${products.length} published` : "Catalogue empty"}</span><h2>Your collection</h2><p>Publish real products with approved photos, options and prices.</p><span aria-hidden="true">↗</span></Link><Link href="/admin/ai"><span className={`studio-status ${managedAi || ai.environmentConfigured ? "is-ready" : ""}`}>{managedAi ? "Tested connection" : ai.environmentConfigured ? "Configured · test next" : "Saved answers only"}</span><h2>KEO Muse</h2><p>Test an AI reply and check the public assistant on your website.</p><span aria-hidden="true">↗</span></Link></section>
    <section className="studio-panel"><h2>Connections & configuration</h2><p className="studio-panel-intro">No secret values are displayed here. After changing environment variables on your host, redeploy or restart the application.</p><div className="launch-check-list">{checks.map(check => <article key={check.id}><span className={`launch-check-icon ${check.ready ? "is-ready" : ""}`} aria-hidden="true">{check.ready ? "✓" : "○"}</span><div><h3>{check.title}</h3><p>{check.detail}</p><small>{check.action}</small></div><span className={`studio-status ${check.ready ? "is-ready" : ""}`}>{check.ready ? "Present" : "Review"}</span></article>)}</div></section>
    <section className="studio-panel launch-final-checks"><h2>The final walkthrough</h2><ol><li>Sign in with the owner account, then verify an editor cannot access KEO Muse or this page.</li><li>Upload a real product image, save a draft, preview it and publish. Open that product on the public site.</li><li>Choose a product option and send a test enquiry to your own WhatsApp. Confirm the product and option details are correct.</li><li>Test KEO Muse with a price question and a delivery question; then disable the provider and check the saved-answer fallback.</li><li>Review content and privacy information, configure Firestore TTL on aiRateLimits.expiresAt, and test your scheduled cleanup.</li></ol></section>
  </main>;
}

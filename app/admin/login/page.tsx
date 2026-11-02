import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getVerifiedAdminSession } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Private KEO Hairven admin access.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getVerifiedAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="admin-login-shell">
      <section className="admin-login-brand" aria-label="KEO Hairven admin">
        <Image className="admin-login-logo" src="/assets/brand/keo-hairven-wordmark.png" alt="KEO Hairven" width={2172} height={724} priority />
        <div className="admin-login-brand-copy">
          <div className="eyebrow">YOUR BRAND. YOUR SPACE.</div>
          <h1>A beautiful business,<br /><em>simply managed.</em></h1>
          <figure>
            <Image src="/assets/campaign/waves-campaign.webp" alt="Hair inspiration with glossy black waves" fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "50% 50%" }} priority />
          </figure>
        </div>
      </section>

      <section className="admin-login-panel">
        <div className="admin-login-panel-inner">
          <div className="eyebrow">WELCOME BACK</div>
          <h1>Sign in to<br />your workspace.</h1>
          <p>Manage products, share your work and keep your details up to date.</p>

          <AdminLoginForm />

          <div className="admin-private-notice">Private access for authorised admins only.</div>
          <Link className="admin-back-link" href="/">← Back to the website</Link>
        </div>
      </section>
    </main>
  );
}

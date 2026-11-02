import Image from "next/image";
import Link from "next/link";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { getAdminOverviewData } from "@/lib/admin-overview";

export function AdminOverviewSkeleton() {
  return (
    <div className="admin-overview-content" aria-busy="true" aria-label="Loading admin overview">
      <div className="admin-overview-skeleton-title" />
      <div className="admin-overview-skeleton-notice" />
      <div className="admin-overview-skeleton-grid">
        <div /><div />
      </div>
      <div className="admin-overview-skeleton-stats">
        <div /><div /><div />
      </div>
    </div>
  );
}

export async function AdminOverviewContent() {
  const [data, session] = await Promise.all([getAdminOverviewData(), getVerifiedAdminSession()]);

  return (
    <div className="admin-overview-content">
      <div className="admin-overview-head">
        <div className="eyebrow">KEO HAIRVEN</div>
        <h1>Make room for your next chapter.</h1>
      </div>

      <div className={`admin-overview-notice${data.source === "live" ? " is-live" : ""}`}>
        {data.source === "live"
          ? "Your content overview · these counts come from the records you manage here."
          : "Set up your own hair products, content, contact details and approved images before publishing."}
      </div>

      <section className="admin-overview-quick" aria-label="Quick actions">
        <div className="admin-overview-panel admin-overview-action-panel">
          <h2>Add something new</h2>
          <div className="admin-overview-actions">
            <Link className="button button-primary" href="/admin/products/new">+ Add product</Link>
            <Link className="button button-outline" href="/admin/gallery/new">+ Upload a look</Link>
          </div>
        </div>
        <div className="admin-overview-panel admin-overview-action-panel">
          <h2>Make it yours</h2>
          <p>Update your contact details, homepage words and FAQs.</p>
          <div className="admin-overview-actions">
            <Link className="button button-outline" href="/admin/content">Edit website details <span aria-hidden="true">→</span></Link>
            <Link className="button button-outline" href="/admin/settings">Business settings <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      {session?.role === "owner" && <Link className="studio-launch-banner" href="/admin/launch"><span><b>From setup to storefront.</b><small>Owner launch checklist · connections, content and final checks</small></span><span aria-hidden="true">↗</span></Link>}

      <section className="admin-overview-stats" aria-label="Content counts">
        {data.stats.map((stat) => (
          <div key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section className="admin-overview-columns">
        <div className="admin-overview-panel admin-overview-checklist">
          <h2>Before your first launch</h2>
          {data.checklist.map((item, index) => (
            <div className="admin-overview-row" key={`${item.title}-${index}`}>
              <div>
                <b>{item.title}</b>
                <p>{item.body}</p>
              </div>
              <span>{index + 1}</span>
            </div>
          ))}
        </div>

        <div className="admin-overview-panel admin-overview-next-step">
          <h2>Your next small step</h2>
          <figure>
            <Image
              src="/assets/campaign/hair-collection.webp"
              alt="Hair collection"
              fill
              sizes="(max-width: 900px) 100vw, 34vw"
              style={{ objectFit: "cover", objectPosition: "50% 48%" }}
            />
            
          </figure>
          <h2>{data.nextStep.title}</h2>
          <p>{data.nextStep.body}</p>
          <Link className="button button-outline" href={data.nextStep.href}>
            {data.nextStep.action} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

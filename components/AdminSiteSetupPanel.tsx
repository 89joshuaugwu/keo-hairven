import type { SiteSetupStatus } from "@/lib/site-setup-shared";
export function AdminSiteSetupPanel({ initialStatus: _initialStatus, role: _role }: {initialStatus: SiteSetupStatus;role:"owner"|"editor"}) {
  return <section className="admin-editor-panel" id="site-setup"><div className="eyebrow">KEO CONTENT SETUP</div><h2>Add your brand content</h2><p>To protect your new business, importing the original salon's starter data is disabled. Create your own hair products, upload approved media and publish your KEO business details from the CMS.</p></section>;
}

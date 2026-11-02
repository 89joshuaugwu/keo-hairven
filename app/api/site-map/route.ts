import { getSitemapEntries } from "@/lib/sitemap-server";
import { sitemapXml } from "@/lib/sitemap-xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await getSitemapEntries();
    return new Response(sitemapXml(entries), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Sitemap-Handler": "site-map-api",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Sitemap temporarily unavailable. Please retry later.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    });
  }
}

import type { MetadataRoute } from "next";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map(entry => {
    const fields = [`<loc>${escapeXml(entry.url)}</loc>`];
    if (entry.lastModified) {
      const modified = entry.lastModified instanceof Date ? entry.lastModified.toISOString() : entry.lastModified;
      fields.push(`<lastmod>${escapeXml(modified)}</lastmod>`);
    }
    if (entry.changeFrequency) fields.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
    if (entry.priority !== undefined) fields.push(`<priority>${entry.priority}</priority>`);
    return `<url>${fields.join("")}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

// Deliberately avoid inheriting the source business domain. Set this in production.
const FALLBACK_SITE_URL = "http://localhost:3000";
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || FALLBACK_SITE_URL).replace(/\/$/, "");
}

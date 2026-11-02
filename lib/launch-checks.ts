export type LaunchCheck = { id: string; title: string; ready: boolean; detail: string; action: string };
export function launchChecks(env: Record<string, string | undefined>): LaunchCheck[] {
  const has = (...keys: string[]) => keys.every(key => Boolean(env[key]?.trim()));
  let origin = false;
  try { const url = new URL(env.NEXT_PUBLIC_SITE_URL || ""); origin = url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/" && !url.search && !url.hash; } catch {}
  let encryption = false;
  try { encryption = Buffer.from(env.AI_KEYS_ENCRYPTION_KEY_BASE64 || "", "base64").length === 32; } catch {}
  const projectMatch = !env.FIREBASE_PROJECT_ID || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID === env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return [
    { id: "origin", title: "Public website address", ready: origin, detail: "Use the final HTTPS origin for canonical links, authentication and request checks.", action: "Set NEXT_PUBLIC_SITE_URL on your host, then rebuild." },
    { id: "firebase-browser", title: "Admin sign-in", ready: has("NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"), detail: "Browser configuration must belong to your own Firebase project.", action: "Enable Email/Password or Google in Firebase Authentication and add your website to authorised domains." },
    { id: "firebase-server", title: "Private database connection", ready: has("FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY") && projectMatch, detail: projectMatch ? "Server credentials are required for publishing, owner access and chat usage limits." : "The browser and server Firebase project IDs do not match.", action: "Add your service account credentials, create Firestore and deploy firestore.rules." },
    { id: "owner", title: "Owner bootstrap", ready: has("ADMIN_OWNER_EMAILS"), detail: "Use an owner email allowlist for first access. Verified Firebase admin/owner custom claims also work.", action: "Create your Firebase Authentication user and include its email in ADMIN_OWNER_EMAILS, or assign owner claims." },
    { id: "media", title: "Media uploads", ready: has("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"), detail: "Cloudinary stores the product and lookbook media you upload.", action: "Add your Cloudinary account credentials and verify one upload from Media library." },
    { id: "session", title: "Request protection", ready: (env.SESSION_CSRF_SECRET?.length || 0) >= 32, detail: "A stable server secret protects chat usage identifiers. No raw visitor address is stored.", action: "Generate at least 32 random bytes and set SESSION_CSRF_SECRET." },
    { id: "encryption", title: "Encrypted AI connection storage", ready: encryption, detail: "Needed to save Gemini keys securely from the owner workspace.", action: "Set AI_KEYS_ENCRYPTION_KEY_BASE64 to a 32-byte base64 key. Keep it stable after saving connections." },
    { id: "ai", title: "Environment AI connection", ready: has("GEMINI_API_KEY"), detail: "Optional when an owner-managed Gemini connection is already enabled in KEO Muse settings.", action: "Set GEMINI_API_KEY and GEMINI_MODEL, or add a connection in KEO Muse. Test a reply before launch." },
    { id: "cleanup", title: "Scheduled trash cleanup", ready: has("TRASH_CRON_SECRET"), detail: "The cleanup endpoint requires a bearer secret and an external scheduler.", action: "Set TRASH_CRON_SECRET, then schedule GET /api/cron/trash every five minutes with the Authorization bearer header." },
  ];
}

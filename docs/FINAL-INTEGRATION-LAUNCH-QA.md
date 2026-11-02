# Final Integration + Launch QA — v18

## Public experience

- Home, Gallery, Look Detail, Products, Product Detail, Services, Service Detail, About, Contact, FAQ, Privacy and branded 404 are present.
- Ask Zara uses the branded launcher, public settings, saved FAQ fallback and owner-managed Gemini connections.
- The launcher keeps its cylindrical shape; only its thin border carries the continuous raspberry/gold travelling highlight.
- Footer collision logic measures the real footer position and lifts the launcher when necessary.
- Public campaign/provenance captions use compact labels such as `AI inspiration` and `Preview image`; full provenance safeguards remain where they are needed for truthfulness.
- Product/Service starter previews remain `noindex` until real records are published.

## Admin

- Firebase email/password and Google authentication are exchanged for a server-verified HttpOnly admin session.
- Admin routes are globally `noindex` through `app/admin/layout.tsx` and are also disallowed in `robots.txt`.
- Product, Gallery, Service, Media, Website Content, Business Details, AI Assistant and centralized Backup workflows are present.
- Browser-facing client modules do not transitively import Firebase Admin or Node-only modules.
- Direct browser Firestore access is denied by `firestore.rules`; app data goes through protected Next.js APIs using Firebase Admin.

## Backup

The owner-only Business Details backup now:

- snapshots managed Firestore collections;
- includes code fallback/starter records;
- copies current bundled and managed website media into a unique Cloudinary backup folder per backup run;
- strips `undefined` values before writing backup metadata to Firestore;
- chunks Cloudinary metadata so large libraries do not hit the Firestore 1 MiB document limit;
- reports the exact failed stage back to Admin if another production error occurs;
- does not publish drafts or change the live site.

The previous production 500 happened after the Cloudinary calls. v18 removes the most likely Firestore metadata serialization failure and improves error visibility for any remaining environment-specific failure.

## SEO / indexing

Implemented:

- Google Search Console verification file in `public/`.
- root metadata with canonical origin, Open Graph and Twitter metadata.
- `BeautySalon` JSON-LD using approved public business settings.
- `/robots.txt` via `app/robots.ts`.
- `/sitemap.xml` via `app/sitemap.ts`.
- `/manifest.webmanifest` via `app/manifest.ts`.
- admin/API crawling blocked.
- public detail pages use canonical metadata.
- live products/services enter the sitemap only after publication; starter preview products/services remain noindex.

After deployment, submit `<final-domain>/sitemap.xml` in Google Search Console. Verification alone does not force indexing; Google still needs to crawl and accept the pages.

## Source QA performed in this handoff

- TS/TSX syntax parse across app/components/lib/config.
- CSS brace balance.
- static internal-link route audit.
- client → server-only dependency graph audit.
- route-segment config re-export audit.
- native `<select>` / browser date-input audit.
- secret-file packaging audit.
- Search Console verification-file presence.
- Firebase rules/config presence.


### Latest static QA result

- 172 TypeScript/TSX source files parsed with 0 syntax diagnostics.
- CSS braces balanced: 2050 opening / 2050 closing.
- 43 client modules audited; 0 transitive client → Firebase Admin/server-only dependency leaks.
- 0 illegal Next.js route segment config re-exports.
- 0 missing static internal links in the route audit.
- 0 missing referenced bundled assets.
- 0 native `<select>` controls and 0 native `type="date"` controls.
- `.env.local` and `zara-luxe-strands-firebase-adminsdk.json` are excluded from the handoff.

## Required external verification

This environment cannot currently complete `npm install` against the npm registry, so dependency-backed `npm run typecheck` and `npm run build` must still be run locally or by Vercel after v18 is deployed.

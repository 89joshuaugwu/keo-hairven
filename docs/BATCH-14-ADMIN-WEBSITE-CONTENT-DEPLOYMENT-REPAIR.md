# Batch 14 — Admin Website Content + deployment repair

## Routes and public integrations
- `/admin/content` — protected Website Content editor.
- `/` — published Homepage heading, supporting copy, rotating phrases, section visibility and hero media.
- `/about` — published About copy and About media.
- `/faq` — published FAQ projection, order and categories.
- Shared WhatsApp CTA — published copy is used wherever the shared CTA component appears.
- Ask Zara — approved published FAQ answers are loaded into deterministic/public AI context.

## Admin Website Content
The editor follows the supplied Admin Content visual language while implementing the full route contract rather than only the two demo FAQ rows in the static board.

It supports:
- Homepage heading and supporting copy.
- Up to five rotating phrases separated in the UI by `/`.
- Homepage hero media chosen from the Media Library.
- Homepage section visibility for Beauty Edit, Nail Editorial, Hair Collection and Three Easy Steps.
- About headings, introduction, story paragraphs and media.
- Shared WhatsApp CTA eyebrow, heading, emphasis, body and button label.
- FAQ add/edit/category/reorder/Trash/Restore.
- Save Draft, in-admin Preview and Publish.
- Optimistic content and FAQ revision checks.
- Safe `publicSettings/site` and `publicFaqs` projections.

Motion remains automatic as previously requested. This editor does not reintroduce a public Pause/Play control.

## Media-reference safety
Website Content now participates in Media Library reference discovery. A persisted Cloudinary asset selected for the Home hero or About media is treated as referenced, so Media Library deletion remains blocked until it is removed/replaced from Website Content. Trashed media cannot be newly projected to the public site.

## Deployment repair
The failed v11-v13 production deployments were audited from the supplied Vercel log. Two root build-boundary failures were present:

1. **Route segment configuration was re-exported.**
   `app/api/admin/media/finalise/route.ts` re-exported `runtime` from the `finalize` route. Next.js 16 requires route segment config such as `runtime` to be statically declared in the route file itself.

   Repair: both spelling variants now declare `export const runtime = "nodejs"` locally and call a shared server-only handler in `lib/admin-media-finalize-handler.ts`. No route-segment config is re-exported.

2. **Firebase Admin leaked into browser bundles.**
   Client components imported types/helpers from server modules such as `lib/admin-looks.ts`. Because that module imports `firebase-admin`, Turbopack followed the dependency into the browser graph and then failed on Node-only modules (`fs`, `child_process`, `net`, `tls`, `http2`).

   Repair: client-safe records/labels were split into pure shared modules:
   - `lib/look-admin-shared.ts`
   - `lib/admin-product-shared.ts`
   - `lib/admin-service-shared.ts`
   - `lib/admin-media-shared.ts`

   Product, Gallery, Service, Media and Website Content client components import only those client-safe types/helpers. The Firestore/Firebase Admin implementations remain in server-only modules.

Additional hardening:
- `server-only` guards were added to Firebase Admin, private admin data modules and server public-projection loaders.
- Published Look media keeps an explicit `LookMedia["kind"]` type rather than a widened string.
- A transitive client-boundary audit reports no path from any `use client` module to `firebase-admin`, Node built-ins, `next/headers`, `next/cache` or a `server-only` implementation module.
- A route-config audit reports no `runtime`/`dynamic`/`revalidate` re-export.

## Firestore separation
Private authoring:
- `settingsDrafts/site`
- `faqs`

Public projections:
- `publicSettings/site.content`
- `publicFaqs`

Public pages never read private drafts.

## Verification note
The execution environment used for this handoff cannot currently install the project dependencies from npm, so it cannot provide a genuine dependency-backed `next build`. The source was instead checked for syntax diagnostics, client/server dependency boundaries, route-config re-exports, native-control regressions, CSS balance and secret-file leakage. Run `npm install && npm run typecheck && npm run build` before redeploying to Vercel.

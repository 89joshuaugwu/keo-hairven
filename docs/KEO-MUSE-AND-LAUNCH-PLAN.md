# KEO Hairven — studio refinement and launch plan

Date: 2 November 2026. Scope: complete source handoff; no production credentials supplied and no live deployment requested.

## Audit and direction

The first editorial pass established a coherent espresso/rose identity but the visitor journey still has dead ends: no conversational guide, no way to express a style preference before browsing, sparse empty-catalogue experiences, old-brand text in admin, and hidden AI settings. The admin retains several inconsistent dialogs and there is no actionable connection checklist. A styled empty catalogue alone cannot make a business ready to trade: an owner must supply authentic products and contact details.

Keep Bodoni Moda and DM Sans, espresso #2B1D1B, ivory #FAF7F2, rose #D9B5AE, champagne #D3C1A5 and muted ink #72635D. Elevate the signature through an interactive **Find your mood** editorial stage: generous photography, texture choices, animated image/copy changes and clear collection links. Avoid another repeated card grid. Existing campaign imagery remains explicitly inspiration, never invented inventory. Motion supports exploration: staggered entrances, smooth disclosures, photo transitions and dialog entrance/exit; respect reduced motion.

## Implementation tasks

1. **KEO Muse, the brand's AI hair guide.** Replace the inherited public widget with an accessible, responsive chat dialog, greeting/suggestion states, clear/cancel/retry controls and real server replies. Mount only on public routes. Server uses published products, FAQs, business details and gallery, with Gemini settings managed by owner. Support a server-only Gemini environment connection for first launch, while preserving encrypted owner-managed connections. Bound requests/history/timeouts and enforce durable global and visitor rate limits before provider calls. Keep honest saved-answer fallback for missing credentials, limits and outages. Never let model output invent clickable destinations or grant tools/permissions. No stored conversation archive.
2. **Interactive storefront.** Add the mood stage with purposeful transitions and assistant entry points; refine inner-page titles, empty states and mobile spacing; FAQ search/clear and smooth accessible disclosure; improve contact validation and unconfigured-contact state; a branded 404. Preserve the catalogue/CMS contracts and real ordering workflow.
3. **Admin studio.** Unify admin typography, surfaces, navigation and form density; expose owner-only Muse settings and launch checklist. Use shared accessible modal behavior for changed flows. Show read-only configuration readiness without secrets. Repair residual Zara copy and obvious setup pitfalls while preserving roles, revisions, publishing and trash behavior.
4. **Launch handoff.** Provide correct .env.example, a local configuration check, Firebase rules, owner bootstrap and deployment instructions. Audit links/assets, API protection, metadata and errors. Include exact checklist for owner-created Firebase, Cloudinary, Gemini and actual published content. No claims that credentials or production flows were exercised when unavailable.
5. **Verify and review.** Add meaningful server tests for request validation, provider success/fallback, disabled state, quota, unsafe links and published-data boundaries. Run existing tests, typecheck and production build. Inspect responsive pages and hydrated client states where the supported preview allows it. Fresh whole-change reviewer; fix material findings. Package sanitized source and save final ZIP.

## Contracts and implementation ownership

- `app/editorial.css`: public brand and motion. `app/studio.css`: admin register using the same core colors and DM Sans, restrained headings.
- `components/KeoMuse.tsx` + `app/muse.css`: assistant interaction/presentation. Public configuration never contains keys.
- `lib/muse-*`: testable pure request/reply orchestration plus server adapters; `/api/chat` validates and delegates.
- Existing `admin-ai.ts`: encrypted provider settings. New env connection is server-only, shown as environment-managed in owner UI; never copied to client.
- Existing admin authorization remains mandatory; no QA authentication bypass in deliverable.
- Native authored `<dialog>` primitive owns modal focus/inert/Escape/restoration. Existing confirmation component remains canonical for deletion.
- Enquiries continue through WhatsApp; no simulated order, booking or payment confirmation.

## Progress

- Audit complete: AI route is unconditional 503; launcher unmounted; AI page absent from admin menu; old-brand text and malformed environment comments found.
- Implementation in progress.

# KEO Hairven Editorial Upgrade Implementation Plan

> For agentic workers: execute task by task using the executing-plans workflow. User has authorized continuous execution.

**Goal:** Upgrade the existing hair storefront with a coherent visual identity, editorial page composition and accessible motion.
**Architecture:** Preserve server-rendered content and Firestore projections. Use a separate public CSS layer after legacy globals, shared collection definitions, and client components only for interaction/motion. Keep all existing admin and commerce logic.
**Tech stack:** Next.js 16.2, React 19.2, TypeScript, CSS, IntersectionObserver, Web Animations API.
**Spec:** `docs/superpowers/specs/2026-11-01-keo-editorial-design.md`

## Global constraints
- Use existing brand assets and data sources. Do not fabricate inventory, claims, prices, numbers or policies.
- Espresso #2B1D1B, ivory #FAF7F2, rose #D9B5AE, champagne #D3C1A5, muted #72635D, line #DFD5CC.
- Self-host Bodoni Moda and DM Sans; retain legacy fonts for admin.
- No new runtime animation dependency; opacity/transform transitions; reduced motion and visible pause control.
- Keep the original source archive and secrets out of the deliverable.

## Review focus
- Long custom headings and empty catalogue content remain legible and actionable.
- Menu rapid toggling, Escape, keyboard focus and route changes do not leave body locked.
- No hidden essential content if JavaScript/observers fail; reduced motion stops animations/video.
- Mobile collection grids, forms, filters and footer have no accidental horizontal overflow.
- Existing real contact fallback and CMS visibility flags continue to work.

## Task 1 — Identity and shared foundations
Files: `DESIGN.md`, `app/editorial.css`, `app/layout.tsx`, self-hosted `public/assets/fonts`.
- [x] Document visual decisions and canonical token mapping.
- [x] Install/download font assets without adding a client font service.
- [x] Add public CSS layer and shared motion provider. Preserve admin typography/scoping.
- [x] Validate font asset existence, TypeScript and semantic hierarchy.

## Task 2 — Campaign homepage and collections
Files: `app/page.tsx`, `app/collections/page.tsx`, `components/CollectionCards.tsx`, `lib/collections.ts`, `components/EditorialMarquee.tsx`.
- [x] Rebuild campaign hero around CMS heading/media and a small collection inset.
- [x] Compose collection edit, real featured items or useful empty panel, immersive lookbook, brand story and three-step enquiry flow.
- [x] Preserve content visibility flags; differentiate editorial imagery from actual published product images.
- [x] Add truly duplicated marquee content, pause control and reduced-motion behavior.
- [x] Check all destination routes/query slugs and published-product conditions.

## Task 3 — Navigation and movement
Files: `components/SiteHeader.tsx`, `components/MotionProvider.tsx`, `components/ManagedEditorialMedia.tsx`.
- [x] Active route, original wordmark, compact navigation, scroll state and mobile dialog.
- [x] Add interruptible opening/closing animation; preserve focus trap, Escape and restoration.
- [x] Add once-only reveals with cleanup; no global interception of links.
- [x] Add pause/play button for campaign video; respect reduced motion and document visibility.
- [x] Validate typing, effect cleanup and accessible names.

## Task 4 — Supporting pages and footer
Files: `components/SiteFooter.tsx`, `components/WhatsAppCta.tsx`, `app/editorial.css`, page heading markup where necessary.
- [x] Cohesive header/CTA/footer across public routes.
- [x] Improve catalogue/filter/empty states, lookbook imagery, story composition, contact fields and FAQ rhythm.
- [x] Keep forms, routing and product/admin behavior unchanged.
- [x] Verify small screen rules, focus states, dark/light text contrast and no forced motion.

## Task 5 — Verification and handoff
Files: `docs/REDESIGN-VERIFICATION.md`, `HANDOFF.md`, `CHANGELOG.md`.
- [x] Run `npm run typecheck`, `npm test`, `npm run build`; investigate real failures and record results.
- [x] Run static design audit and inspect changed code for scope leaks, invalid targets and contradictory selectors.
- [x] Attempt supported browser preview; report exact remaining limit if unavailable.
- [x] Review full change, fix important issues, mark checklist complete with evidence.
- [x] Package source excluding `.env.local`, service-account JSON, `node_modules`, `.next`, `.git`, caches and temporary material. Preserve `.env.example`.
- [x] Save deliverable and return source ZIP plus plan.

## Execution log
- 2026-11-01: Inspected all three source archives and photography, reviewed supplied skills and reference contact sheet. Dependencies installed successfully. Managed preview refused Next.js flags before startup; do not claim rendered baseline.

### Decisions and evidence
- Task 1: complete. Self-hosted Bodoni Moda/DM Sans and licenses added; public tokens isolated from admin; DESIGN.md reconciled.
- Task 2: complete. Homepage and collection structure rebuilt; CMS flags and real products preserved.
- Task 3: complete. One root preference owner, progressive reveals, dialog exit/focus management, shared media controls.
- Task 4: complete. Shared CTA/footer and supporting public routes use the new language.
- Task 5: source checks and source packaging completed; full live integration/interaction matrix remains explicitly unverified.
- Ruling: the uploaded project is an existing Next.js application with backend routes, so preserve its framework and return a full source upgrade instead of migrating it into an incompatible static hosting stack.
- Ruling: styling is verified through QA-only mirrors of built HTML, CSS and assets. Scripts were omitted and optimized image URLs resolved to their original local images in those mirrors. This proves composition, not hydrated interactions.
- Original suite reproduced six failures on the untouched upload. Registry fixtures used removed wigs/attachments ids; product fixtures depended on a deliberately empty starter array. Tests now exercise KEO categories and explicit in-memory published→trash→purge / restore→draft→published projections. No fake public products were added.
- Review: fresh reviewer found a hidden-section anchor, missing heading id, inconsistent About video controls and an inset animation fill conflict; all corrected.
- Browser QA identified low-contrast unconfigured contact copy and small-screen footer overflow; corrected.

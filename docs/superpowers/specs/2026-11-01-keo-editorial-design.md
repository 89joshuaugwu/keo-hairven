# KEO Hairven editorial redesign

## Intent and audience
Help a prospective KEO customer discover hair styles, compare published catalogue entries and start an informed enquiry. The site should feel like a considered hair campaign: confident, tactile and alive. The user explicitly authorized analysis, a detailed plan and implementation without further approvals.

## Evidence and audit
- Next.js 16 / React 19 storefront, Firestore-backed public content and catalogue, protected admin, WhatsApp/contact enquiries. Retain these boundaries.
- `app/globals.css` combines successive batches, original pink/purple literals and a final chocolate override. The hero is a rigid 49/51 split; most sections repeat the same heading/grid rhythm.
- The original transparent logo has a tall intrinsic ratio. Scaling it into a wide navigation slot makes it small and weak.
- Cormorant/Manrope roles are inconsistent and headings frequently lean on italic emphasis rather than a clear scale.
- `MotionProvider` supplies preferences but not reveals. The homepage has no provider, so its media cannot honor the shared preference. Ribbon content is not duplicated, causing a broken loop. Navigation unmounts immediately and has no exit phase.
- Starter photography has cream, blush and brown backgrounds. Make the interface complement these photographs; do not invent stock, testimonials or sales figures.
- `HANDOFF.md` confirms no verified product catalogue or business number. Keep empty states useful and preserve Contact fallback.

## Source material applied
Uploaded skills: `premium-ui-revamp-skill` and its rubric/patterns; `animation-performance`; supplied typography/menu/scroll research. Visual contact sheet of the supplied references reviewed: most are fintech. Borrow hierarchy, campaign pacing and interactive clarity; do not transplant their brand colors, trust claims or dashboard motifs.
Specific references: `motion-prompts/web-type/09-heading-reveal.md` (headline entrance), `web-navigation/17-staggered-menu-logo-ticker.md` (menu rhythm and seamless loop), `web-scroll/08-count-up-sticky-expansion-spotlight.md` (sticky explanatory content; omit fictional metrics), and `web-components/15-slow-masked-marquee.md` (continuous restrained typography).

## Approaches considered
1. Cosmetic recoloring: smallest change, but retains weak composition and repetitive rhythm.
2. Full application rewrite: freedom, but needlessly risks catalogue/admin integrations.
3. Selected: redesign the public presentation in the current stack, using shared tokens, reusable editorial components, semantic navigation and a small progressive motion layer. This has the visual impact the user asked for while preserving data behavior.

## Visual thesis
A fashion editorial built around the movement and texture of hair. One dramatic espresso campaign hero, soft rose accents drawn from the supplied photography, light collection pages, crisp type, generous but useful spacing. A floating editorial image inset connects the hero to the collection. Alternate immersive image sections and quiet, readable utility regions.

## Normative system
- Espresso `#2B1D1B`: headings, dark panels, primary controls.
- Ivory `#FAF7F2`: main canvas.
- Rose `#D9B5AE`: accents and image-adjacent surface.
- Champagne `#D3C1A5`: quiet divider/accent on dark.
- Muted ink `#72635D`: supporting text on light.
- Line `#DFD5CC`: borders.
- Bodoni Moda 400 normal/italic: campaign and major headings. DM Sans 400/500/600: body, utility and controls. Self-host WOFF2 with swap; no remote font dependency. Original fonts remain available for legacy admin styling.
- Content max width 1440px, fluid gutters 22–80px, 8px-derived spacing, 2–4px control rounding. Buttons minimum 48px; icon targets 44px.

## Motion and accessibility
Use transform/opacity for hero entrances, section reveals, image hover scale and navigation transitions. Once-only reveals with IntersectionObserver; essential content is visible before JS and when reduced motion is enabled. No scroll hijacking or forced page-transition delays. Animate menu closing while keeping focus management valid, then restore focus. Pause ambient movement and videos with the shared preference and visible controls. Root public chrome skips admin routes. Support keyboard and touch, visible focus, semantic navigation, active route, skip link and scroll margins. Do not use custom cursors.

## Functional constraints
Preserve published content and toggles, routes, real catalogue data, query filters, variant selection, schemas and admin APIs. No new purchase flow, fabricated product, fake review or contact details. Editorial imagery must remain explicitly described as inspiration. Existing admin utilities retain their own compact register.

## Delivery and verification
Deliver revised source ZIP with this spec, implementation plan, updated DESIGN.md and verification notes. Exclude credentials, dependencies and build caches. Run typecheck, existing domain/service tests and production build. Preview initially failed: managed service injects Vite-only `--host` and `--strictPort` into `next dev`. Do not claim browser QA unless the supported preview can be repaired without changing working app behavior. Production release still requires authentic KEO media and configured business details; this task does not migrate its Next.js backend to another hosting stack.

# KEO Hairven — v0.19.0 redesign handoff

The full Next.js source has been upgraded. Start with `docs/superpowers/specs/2026-11-01-keo-editorial-design.md` for the analysis and direction, `docs/superpowers/plans/2026-11-01-keo-editorial-upgrade.md` for the detailed plan/execution record, and `docs/REDESIGN-VERIFICATION.md` for checks and limitations.

## Run locally
1. Use Node 22 as declared in package.json.
2. Run `npm ci`.
3. Restore your existing `.env.local`, or use `.env.example` to configure your own project. Secrets and local environment files are excluded from this handoff ZIP.
4. Run `npm run dev`. Open the URL Next.js prints.
5. Run `npm run typecheck`, `npm test`, and `npm run build` before deployment.

## What changed
- New self-hosted Bodoni Moda / DM Sans typography and espresso/ivory/rose/champagne palette.
- Campaign homepage, collection edit, immersive lookbook feature, story and enquiry journey.
- Shared header with active navigation, animated mobile dialog and focus handling.
- Progressive section reveals, headline entrance, image hover and seamless pausable marquee.
- One root motion preference owner; shared campaign/About media playback and pause controls.
- Consistent public catalogue, contact, story, FAQ, CTA and footer styling.
- Current KEO category/product test fixtures; 26 tests pass.

## Source ownership
Public visual tokens and components: `DESIGN.md` and `app/editorial.css`. Business rules and Firestore/admin APIs keep their existing owners. Original admin utility typography is retained. No runtime animation dependency was added. Font licenses accompany the WOFF2 assets.

## Deployment and content
This is the full source upgrade; it has not been deployed to your production site. The original uploaded ZIP is unchanged. No real product catalogue or verified business phone was provided; no products, prices, reviews or business contacts have been fabricated. Publish authentic KEO media and configure business details before release. Existing Contact fallback remains active.

Static browser previews verify layout, image crops and responsive CSS, not hydrated live-app interactions. Test the mobile menu, video controls, CMS editing, live uploads and enquiry destinations on your normal Next.js host before production release. Historical pre-redesign notes are preserved in `docs/HANDOFF-before-editorial-upgrade.md`.

## AI assistant finding
The inherited Ask KEO widget and Gemini admin connection code remain, but the widget is not mounted and `/api/chat` returns HTTP 503 unconditionally. Both conditions were present in the original upload. See `docs/AI-ASSISTANT-AUDIT.md`. It was inspected and preserved; it has not been enabled by this redesign.

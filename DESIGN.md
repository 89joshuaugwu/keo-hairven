# KEO Hairven — Editorial identity

## Product and audience
A hair-only catalogue for customers exploring wigs, bone-straight hair, extensions and bundles. Primary journey: discover → view published product/options → contact the brand to confirm availability, delivery and payment. Brand tagline: **Confidence in every strand.**

## North star
A considered fashion campaign: expressive hair imagery, confident typography and a warm, tactile palette. The espresso opening is the signature moment; collection and enquiry screens are calmer and readable. Use restrained editorial motion rather than scroll hijacking, effects everywhere, or a simulated checkout.

## Palette and runtime ownership
`app/editorial.css` is the canonical public runtime layer, imported after the legacy global stylesheet. The public body scopes variables through `body:has(.site-header)` so the existing admin workspace retains its compact utility styling. `app/globals.css` retains original admin/legacy component support. Do not append more brand override batches there.

| Role | Token | Value | Application |
| --- | --- | --- | --- |
| Espresso | `--ink`, legacy alias `--raspberry` | `#2B1D1B` | Headings, hero, primary controls, CTA |
| Ivory | `--paper`, `--white` | `#FAF7F2` | Main canvas, inverse type, light buttons |
| Rose | `--rose` | `#D9B5AE` | Hero italic, dark-surface accents |
| Champagne | `--gold` | `#D3C1A5` | Quiet detail on dark surfaces |
| Muted ink | `--muted` | `#72635D` | Supporting text on light surfaces |
| Line | `--line` | `#DFD5CC` | Dividers, borders |
| Soft surface | `--blush` | `#EEDFD7` | Secondary section background |

## Typography
Self-hosted **Bodoni Moda 400**, normal and italic, for campaign/display headings. **DM Sans 400/500/600** for public body, navigation, labels and controls. All WOFF2 and font licenses live in `public/assets/fonts/`; no external font service or new runtime dependency. Existing Cormorant Garamond and Manrope remain available for original admin components. Do not add display type to dense admin tables.

Public type roles: desktop hero 56–98px, major section titles 40–64px, route titles 52–88px, card titles 22–35px, body 13–15px, labelled utility 10–12px. Mobile headings recompose rather than shrinking every dimension. Body line height 1.7–1.9. Use italics as emphasis, with sufficient contrast.

## Layout and imagery
Content sections max 1440px; immersive campaign regions max 1600px. Fluid gutters 22–80px. The hero combines type and moving media, with one editorial collection inset. Collection cards stagger gently on desktop; narrow screens use two columns, full collection route uses one column. Image aspect ratios reserve space. Use the original supplied transparent logo at its natural tall ratio, never stretch it into a wide slot.

Available campaign photography is illustrative, not verified KEO inventory or customer work. Keep the editorial label/disclosure. Published catalogue cards use actual data and confirmed media; never create fake prices, reviews, availability or customer counts. See `HANDOFF.md` for launch content constraints.

## Interaction and motion
- One root `MotionProvider`: shared OS preference, progressive IntersectionObserver reveals and route cleanup.
- Hero line entrance, supporting-copy stagger, seamless duplicated marquee, image hover scale and mobile menu entrance/exit.
- Once-only scroll reveals, using transform/opacity. No hidden essential content without JS/observer support. Focused reveal regions become visible immediately.
- Campaign/About media share `ManagedEditorialMedia`, visible pause control and offscreen/document-hidden playback suppression. Reduced motion shows posters instead of autoplay media.
- Marquee has a pause control, hover/focus pause, and reduced-motion suppression.
- No cursor replacement, scroll hijacking, click-interception route curtain or artificial loading delay.
- Navigation uses native links, active-page semantics, a skip link, modal mobile menu, Escape, focus trap/restoration and inert background while open.
- Controls include hover/focus/pressed/disabled states, minimum 44px menu/icon controls and 48–52px primary buttons. Global scrollbar baseline remains visible and supports forced colors.

## Cross-page contracts
Catalogue filter/sort URLs, product options, contact forms, published content toggles, Firestore projections, admin permissions and routes retain their existing owners. Keep button labels aligned with what happens. If no verified business number is configured, use Contact; do not guess a WhatsApp number or imply payment completion.

## Verification and limits
See `docs/REDESIGN-VERIFICATION.md` for exact checks. Static browser mirrors verify composition and responsive CSS; they do not prove hydrated navigation, live Firebase/Cloudinary integration or enquiry delivery. Production launch still needs approved KEO photography and verified business details.

## v0.20 studio and Muse extension

The interactive **Find your mood** stage replaces the repeated homepage collection grid. One large photograph crossfades between three clearly labelled inspiration directions; a tactile selection list changes the copy and category link. `components/MoodStudio.tsx` owns this content. The original collection grid remains on the collections route. No autoplay mood cycling or scroll hijacking.

**KEO Muse** is the brand's AI hair guide. Its espresso header, small italic m. avatar, ivory conversation surface and rose user bubbles derive from the public palette. The launcher is quiet and persistent; a native dialog owns focus, inertness and responsive bottom-sheet behavior. AI versus saved-answer states are explicit. `app/muse.css` owns these surfaces and shared dialog transitions.

**KEO Studio** is the admin register. `app/studio.css` deliberately adapts the same palette: dark espresso sidebar, ivory panels, restrained rose highlights and DM Sans controls/table headings. Display typography is limited to overview/launch/login headings. Actual ready/error semantics use a muted green or warning tone with a text label, never color alone. Existing records, role checks and publishing rules are retained.

`UX-CONTRACT.md` maps shared behavior and authoritative backend owners. `HANDOFF.md` supersedes older launch notes; Muse is now connected in code. External services still require the owner's credentials and live checks.

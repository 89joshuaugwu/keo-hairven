# Batch 01 — Home + shared public foundation

## Implemented
- `/` Home page from the authoritative desktop/mobile screenshots and written Home spec.
- Responsive public header, full-screen mobile menu, footer and motion preference.
- Original logo, bundled Cormorant Garamond/Manrope fonts, exact blush/raspberry/ink/gold tokens.
- Hero word rotation: All you. / Your mood. / Your moment. with reduced-motion and persistent pause behaviour.
- Category ribbon, category cards, nail editorial, hair collection editorial, three-step flow, WhatsApp CTA.
- Ask Zara launcher shell with truthful WhatsApp fallback; Gemini is intentionally not connected yet.
- Generated campaign/inspiration captions remain explicit.
- User-supplied videos mapped to the handoff and copied with audio streams removed.

## Video map
- `01-hero-hair.mp4` — Home hero; muted looping enhancement on desktop and mobile, with still poster fallback.
- `02-nail-details.mp4` — Home nail editorial.
- `03-hair-collection.mp4` — Home collection editorial.
- `05-blush-satin.mp4` — WhatsApp CTA atmosphere across responsive layouts; still fallback under reduced motion.
- `04-braid-detail.mp4` — Gallery/Look Detail and Hair Services inspiration motion.
- `06-shopping-bag.mp4` — About brand-story motion; original bag photo remains poster/fallback.

## Deliberate deviation from design screenshot
The design screenshot shows three draft product prices. The written specification overrides that visual: draft prices must not be exposed publicly until Zara confirms and publishes the products with real media. Therefore Batch 01 keeps the collection section but hides the draft price rows.

## Incremental route handling
Gallery, Products, Services, About, Contact, FAQ and Privacy routes are wired as explicit development placeholders so Home navigation does not 404 during page-by-page implementation. They are NOT considered finished pages.

## Environment
Copy `.env.example` to `.env.local` in the project root. Home renders without credentials. `NEXT_PUBLIC_SITE_URL=http://localhost:3000` is enough locally. Firebase/Cloudinary/Gemini values remain unused until their later build batches.

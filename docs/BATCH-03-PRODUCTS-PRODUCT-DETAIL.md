# Implementation Batch 03 — Products + Product Detail

## Source material reviewed before implementation
- `00-start-here/READ-ME-FIRST.md` and `MASTER-BUILDER-PROMPT.md`
- `05-page-specs/04-products.md` and `05-page-specs/05-product-detail.md`
- Products/Product Detail desktop + mobile exports and all section crops
- Editable design masters `public-04-products-*` and `public-05-product-detail-*`
- `04-assets/ASSET-MANIFEST.json` and `ASSET-USAGE.md`
- `06-motion-and-flow/MOTION-SPEC.md`
- `07-build-guide/ARCHITECTURE.md` and `BUILD-SEQUENCE.md`
- `08-data-and-contracts/DATA-MODEL.md`, `draft-seed.json`, `API-CONTRACTS.md`, `whatsapp-fixtures.json`
- `09-quality-checks/ACCEPTANCE.md`

## `/products`
- Replaces the development placeholder with the responsive catalogue design.
- Category state is URL-backed: `?category=wigs|ponytails|attachments`; all products is canonical.
- Sort state is URL-backed: `?sort=price-low|price-high|title`; Featured is canonical.
- Cards support the contracted availability states: available, made to order, confirm, unavailable.
- Pricing supports fixed/from/range/hidden/quote display without floating-point money.
- No cart, checkout, reservation or stock-count language.
- Whole-card links have descriptive accessible labels.
- Includes product-image fallback, loading skeletons, filtered empty state and no-live-catalogue fallback.
- Includes the supplied waybill section with a destination-first WhatsApp enquiry.

## Draft/product publication boundary
The three supplied ₦45k/₦50k/₦55k seed entries remain `ownerConfirmed=false` design fixtures. They are **not** in `publicProducts` and are never automatically treated as live stock.

Legacy preview behavior (no ENV switch is required in the current build):
- When unset in `next dev`, preview mode is enabled so the supplied design can be reviewed locally.
- When unset in production, preview mode is disabled and only `publicProducts` may render.
- Production product routes for the draft slugs therefore 404 unless preview mode is explicitly enabled for a temporary review build.
- Preview catalogue/detail metadata uses `noindex`.
- When Firebase publishing is connected later, confirmed public projections replace the local preview source.

## `/products/[slug]`
The three handoff preview slugs are available only in design-preview mode:
- `/products/soft-swiss-lace-and-ponytail-12-inch`
- `/products/soft-swiss-lace-and-ponytail-14-inch`
- `/products/soft-swiss-lace-and-ponytail-16-inch`

The detail page includes:
- Breadcrumb, illustrative-media caption and supplied product wording.
- 12/14/16-inch selector with 44px+ mobile targets.
- Atomic selected state, listed-price display, URL update and WhatsApp message update.
- Hidden/quote-price path that asks for price and omits a numeric price from the message.
- Exact handoff WhatsApp fixture composition for the three preview variants.
- Waybill enquiry and a functional “Need help choosing?” action that opens Ask Zara.
- Accessible FAQ accordions.
- Actual 404 for unknown/unpublished slugs.
- No Product/Offer structured data is emitted for preview drafts.

## WhatsApp encoding
`lib/site.ts` now uses strict RFC3986-style escaping on top of `encodeURIComponent`. The three product fixture messages and their full `wa.me` URLs match `whatsapp-fixtures.json` exactly, including `!`, parentheses, `₦`, newlines and canonical product URLs.

## Assets
The product screens use only `campaign/hair-collection.webp` as the handoff’s labelled **illustrative collection** media. It is not presented as an actual item photo. No competitor photo or extra stock image was introduced. Real public products still require owner-confirmed actual-item media.

## Environment
No Firebase, Cloudinary or Gemini credential is required for this implementation batch.

Keep `.env.local` in the project root:
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally.
- Replace it with the real origin before deployment so WhatsApp product links are correct.
- Starter product previews are code fallbacks only and are replaced automatically by published Firestore products.

## Verification completed here
- TS/TSX syntax pass across the cumulative project: 32 files, 0 syntax diagnostics.
- Project relationship/type pass with temporary framework declarations: exit code 0.
- Product price formatting verified from integer kobo: ₦45,000 / ₦50,000 / ₦55,000.
- All three product messages exactly match the supplied WhatsApp message fixtures.
- All three encoded `wa.me` URLs exactly match the supplied WhatsApp URL fixtures.
- Desktop/mobile CSS was checked against the supplied Products/Product Detail screenshots, section crops and editable design-source CSS.

## Environment limitation
A real `npm install`/`next build` cannot run in this packaging environment because DNS resolution to `registry.npmjs.org` returns `EAI_AGAIN`. Chromium is installed but headless screenshot capture hangs in this container, so no new Chromium screenshot comparison is claimed for this batch. Run the README verification commands on an internet-connected machine before deployment.

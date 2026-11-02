# Batch 02 — Gallery + Look Detail

## Source material reviewed before implementation
- `05-page-specs/02-gallery.md`
- `05-page-specs/03-look-detail.md`
- Gallery and Look Detail desktop/mobile exports and section crops
- Editable design-source HTML for both pages
- `04-assets/ASSET-MANIFEST.json` and `ASSET-USAGE.md`
- `06-motion-and-flow/MOTION-SPEC.md`
- `08-data-and-contracts/DATA-MODEL.md`, `API-CONTRACTS.md`, `whatsapp-fixtures.json`
- `07-build-guide/ARCHITECTURE.md` and `BUILD-SEQUENCE.md`
- `09-quality-checks/ACCEPTANCE.md`

## Implemented
### `/gallery`
- Responsive page heading and supplied lookbook copy.
- URL-backed category filters: `?category=braids|wigs|nails`; all is the canonical default.
- Search by look title/tags using `?q=` so the state survives navigation back from detail pages.
- Explicit AI/inspiration provenance notice.
- Responsive editorial grid using only supplied campaign assets; no competitor photography.
- Generated braid video is used as a muted, motion-aware enhancement for the braid card.
- Empty filter state with Clear filters.
- Reserved aspect-ratio loading skeletons and neutral media-failure fallback.
- View all looks resets category/search.

### `/gallery/[slug]`
Implemented published campaign look routes:
- `/gallery/beautifully-braided`
- `/gallery/soft-wave-mood`
- `/gallery/blush-and-gold`

Each detail route includes:
- Breadcrumb with category return path.
- Large media presentation and provenance caption.
- Media count + explicit previous/next controls where multiple media exist.
- Arrow-key and swipe media navigation.
- Image zoom/lightbox with Escape close and focus return.
- Quote-only price presentation; no invented fixed price.
- Honest notice that inspiration is not Zara's completed client work.
- WhatsApp message containing exact title, public reference and canonical URL.
- Copy look link with `Link copied` confirmation and selectable URL fallback if Clipboard API fails.
- Preparation/customisation guidance.
- Real Next.js 404 via `notFound()` for unknown/unpublished slugs.
- Mobile quick enquiry bar after the primary action scrolls away; Ask Zara is lifted above it.

## Data boundary
Batch 02 still does not connect Firestore. The three records are the bundled, owner-supplied design campaign/inspiration content and remain provenance-labelled. No draft product seed or unconfirmed business fact is exposed. Later public data must come from explicit published Firestore projections.

## Video map update
- `04-braid-detail.mp4` is now actively used by Gallery/Look Detail as AI-generated campaign motion.
- `06-shopping-bag.mp4` remains reserved for the About batch.

## Environment
No new credential is required for Batch 02. Keep `.env.local` in the project root. `NEXT_PUBLIC_SITE_URL` matters now because Look Detail WhatsApp messages and canonical links include the public page URL.

For local development:
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`

Before deployment, replace it with the actual deployed origin, for example:
`NEXT_PUBLIC_SITE_URL=https://your-domain.example`

## Verification
- Static visual render compared against supplied Gallery and Look Detail references.
- Checked layouts at 1440, 768, 390 and 360 px; no horizontal overflow was detected.
- Local TypeScript/TSX syntax/project relationship check passed using the system TypeScript compiler with temporary framework declaration stubs.
- A genuine `npm install`/`next build` could not be completed in the packaging environment because npm registry DNS resolution is blocked (`EAI_AGAIN`). Run the commands in the README on a normal internet-connected machine before deployment.

# KEO Hairven — premium hair catalogue

**Status: development handoff; not production-verified or deployed.**

A Next.js 16 / React 19 / TypeScript storefront and protected Firebase CMS adapted from the supplied Zara Luxe Strands source. The original ZIP remains unchanged.

## Included

- Official KEO Hairven artwork and a Dark Chocolate `#442913` / Sand `#D4BBAC` / Warm Ivory `#FAF7F3` visual system.
- Hair-only storefront: Home, Shop, Collections, Lookbook, About, Contact, FAQs and Privacy.
- Customizable homepage content and shared CMS branding.
- Product categories: Bone Straight, Braided Wigs, Hair Extensions, Hair Bundles.
- Product fields for type, material, texture, colour, density, lace, SKU, care instructions and variants.
- Multi-image product detail interface with selection thumbnails.
- One-product-at-a-time WhatsApp enquiries. Selected product options, price and link go into the message.
- Existing Firebase owner/editor authentication, product publishing, Cloudinary uploads, CMS settings and draft workflow retained.
- The original service storefront routes redirect to Shop; the old public AI assistant is disabled.
- **No fake inventory**: old sample products do not appear as published KEO stock.
- **No copied original business number**: WhatsApp links are not enabled until a valid KEO contact number is configured.
- Original-site data import is disabled to avoid accidental salon content publication.

## Quick start

Requires **Node.js 22.x** and npm.

```bash
npm ci
cp .env.example .env.local
# Configure a new Firebase project and Cloudinary account/namespace; see .env.example
npm run typecheck
npm test
npm run dev
# Open http://localhost:3000
npm run build
```

### Required setup before launch

1. **Provision a NEW Firebase project.** Do not connect this build to the original seller's database. Do not reuse existing Firestore `publicSettings`, products, lookbook records, or authorisations.
2. Configure `.env.local` (never commit it). Use a distinct Cloudinary cloud or namespace and supply real Firebase admin credentials securely.
3. Create an approved owner account and publish the actual KEO WhatsApp number under **Admin → Business details**. Until then, purchase enquiries route to Contact instead of a guessed seller number.
4. Publish accurate KEO product names, real product photos, specs, prices and availability from the Admin CMS. Only confirmed products appear in Shop.
5. Replace inherited **illustrative campaign photography/video** with approved KEO photography before public launch. Illustrations in the demo are **not** verified stock or client work.
6. Supply true social handles, location, delivery details, policies and brand story. Review privacy copy against actual hosting/provider setup.
7. Set `NEXT_PUBLIC_SITE_URL` to the verified public domain. Review SEO metadata and Search Console registration.
8. Run full automated typecheck and production build in an internet-enabled development environment, then test mobile layouts, Firestore publishing and all WhatsApp links.

## Important behaviour

- Customers are **not charged** by this site; there is **no checkout, cart, payment gateway, customer login, order status or order-tracking** functionality.
- Launching WhatsApp **starts an enquiry**, not a confirmed order.
- Uploaded hair attributes persist on private draft documents and are copied to public projections on publish.
- Product image upload and admin operations require valid Firebase and Cloudinary credentials.
- Public `/api/chat` returns an explicit unavailable response; the old Ask Zara component is not mounted publicly.
- Salon-related admin API files are retained only for legacy compatibility; they are not linked to the KEO admin navigation. Do not re-enable before carefully reviewing stale data.

## Verification performed here

- **PASS**: TypeScript/TSX parser reported zero syntax errors across **207** source files.
- **PASS**: Focused isolated assertions verified blank default WhatsApp contact, correctly encoded valid WhatsApp URLs, hidden original preview products, hair-spec enquiry contents, and disabled source-data import.
- **NOT RUN**: full `npm run typecheck`, original test suite, `npm run build`, browser responsive walkthrough, Firebase/Cloudinary integration tests. `npm ci` could not complete in this runtime because packages are unavailable to npm (offline cache incomplete). Treat this as a development handoff requiring local verification—not a completed production deployment.

## Main code locations

| Purpose | Location |
| --- | --- |
| Home + featured catalogue | `app/page.tsx` |
| Collections | `app/collections/page.tsx` |
| Shop + product page | `app/products/`, `components/ProductExplorer.tsx`, `components/ProductDetailClient.tsx` |
| Hair fields in product editor | `components/AdminProductEditor.tsx` |
| Firestore data/projections | `lib/admin-product-shared.ts`, `lib/admin-products.ts`, `lib/public-products-server.ts` |
| Business phone and messaging | `lib/business-settings.ts`, `lib/site.ts`, `lib/products.ts` |
| Theme and brand assets | `app/globals.css`, `public/assets/brand/keo-hairven-*` |
| Sitemap and SEO | `lib/sitemap-server.ts`, `app/layout.tsx`, `app/manifest.ts` |

See `DESIGN.md` and `HANDOFF.md` for detail.

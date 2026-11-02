# Batch 05 — About + Contact + branded controls

## Added routes
- `/about`
- `/contact`

## About
- Uses the original Zara Luxe Strands customer-bag photograph supplied in the handoff.
- Keeps the supplied factual story, tagline, FUTO / Owerri location and service-family wording.
- Does not invent a storefront, founder portrait, opening hours or salon facilities.
- Hair & beauty routes to Services; direct conversation routes to Contact; primary CTA opens WhatsApp.

## Contact
- Shows the confirmed number `+234 810 801 7512` and `tel:+2348108017512`.
- Quick enquiry topics: Hair styling, Nails, Products, Waybill, Other.
- Name is optional and capped at 80 characters.
- Message is capped at 1000 characters.
- WhatsApp URL is generated locally only after the user's button click.
- No background email, Firestore lead record or automatic send is performed in this batch.
- Copy-number and copy-message fallbacks are available.

## Branded controls rule
Native browser select menus and native date-picker UI are not used in the current public implementation.
- Product sort uses `BrandSelect`.
- Contact topic uses `BrandSelect`.
- Service preferred date uses `BrandCalendar` with Africa/Lagos date logic.
- Future dropdown/calendar controls should reuse the same branded components or follow the same visual/accessibility system.

## Other changes
- Added `zara-luxe-strands-firebase-adminsdk.json` to `.gitignore`.
- Added `public/google10e1082da8ff45d2.html` for Google Search Console verification.
- Refined service CTA actions so the price chip and Explore button wrap cleanly and become a full-width mobile action.

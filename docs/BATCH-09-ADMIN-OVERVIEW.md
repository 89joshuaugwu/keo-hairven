# Batch 09 — Admin Overview / Dashboard

## Implemented route
- `/admin` — protected Admin Overview

## What the dashboard shows
- Content-management counts only: product drafts, looks awaiting review, services.
- No revenue, order, conversion, customer or traffic analytics are invented.
- Firestore counts are used when private/public admin records exist.
- If the admin database has no content records yet (or Admin SDK is unavailable), the page falls back to the handoff starter counts 3 / 3 / 2 and labels them explicitly as a design preview.

## Admin workspace shell
This batch introduces the reusable protected admin shell for subsequent admin pages:
- Desktop sidebar with actual route highlighting.
- Mobile top bar and fixed bottom navigation: Overview, Products, Gallery, More.
- Mobile More drawer for Services, Media, Website content, Business details, AI assistant and account/sign-out.
- Owner-only AI assistant navigation is visibly restricted for editor accounts.
- Preview website and sign-out actions are included.

## Quick actions
The Overview links to the future Product/Gallery/Content admin routes. Until those batches are built, the protected catch-all admin placeholder explains that the destination is reserved rather than returning a broken 404. Static routes added in later batches will replace these placeholders automatically.

## Data source rules
- Private collection names follow the handoff contract: `products`, `looks`, `services`.
- Public projection counts use `publicProducts`, `publicLooks`, `publicServices` only for setup context.
- No anonymous/client Firestore writes are introduced.
- All Overview Firestore access happens through the Firebase Admin SDK after a verified admin session.

## Next admin batch
Admin Products + Product Editor (`/admin/products`, `/admin/products/new`, `/admin/products/[id]`).

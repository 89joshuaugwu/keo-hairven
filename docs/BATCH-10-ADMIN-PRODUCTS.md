# Batch 10 — Admin Products + Product Editor

## Routes
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]`

## Implemented
- Protected list/search/filter/pagination UI using the supplied admin references.
- Starter product fixtures remain preview-only until explicitly saved.
- Real Firestore draft creation/update with optimistic revision checks.
- Duplicate to draft, Unpublish, Move to Trash and Restore as draft.
- Product editor with title, category, description, price modes, availability, optional variants, actual product media and alt text.
- Signed Cloudinary image upload with progress/cancel/retry and server finalisation verification.
- Basic existing-media chooser backed by the private `media` collection.
- Publish validation: name/category/description, owner confirmation, valid price mode and at least one actual-item image with alt text.
- Safe `publicProducts` projection and public catalogue/detail integration.
- Public projection removal on Unpublish/Trash.

## Safety boundaries
- No draft/private fields are read by public catalogue routes.
- Product starter illustrations cannot satisfy the actual-item-photo publish requirement.
- Upload signing/finalisation and all mutations require a verified admin session, same-origin/CSRF checks and server-only secrets.
- Media deletion/purge is intentionally deferred to the Admin Media batch; Trash does not delete shared assets.

# Batch 11 — Admin Gallery + Look Editor

## Routes
- `/admin/gallery`
- `/admin/gallery/new`
- `/admin/gallery/[id]`

## Admin Gallery
- Search plus category, provenance and status filters.
- Responsive desktop cards and mobile single-column list.
- Add, Edit, Duplicate to draft, Unpublish, Trash and Restore.
- Starter campaign/inspiration records are reviewable without automatic Firestore writes.
- Explicit provenance and permission indicators remain visible in the list.

## Look Editor
- Media upload / media-library selection for JPG, PNG, WebP, MP4 and WebM.
- Images: maximum 8 MB.
- Videos: maximum 20 MB and 10 seconds.
- Media upload supports progress, cancel, retry and server-verified Cloudinary finalisation.
- Selected media can be reordered with accessible keyboard buttons; the first item is primary.
- Title, category, customer-facing description, price display, provenance, AI-generated flag and client permission are editable.
- Save Draft, Preview and Publish are distinct actions.
- Optimistic `revision` checks prevent silent stale overwrites.

## Provenance / permission rules
- `real-work` means Zara's actual work, not campaign or inspiration media.
- AI-generated media cannot be published as Zara's completed client work.
- A real-work look must use owner-uploaded media and every selected media item must have confirmed client permission.
- Permission metadata stays private; the public projection only receives a safe honest provenance label.
- Bundled campaign assets can remain public as inspiration, but cannot be promoted to proof of real completed work.

## Public projection
- Private collection: `looks`.
- Public collection: `publicLooks`.
- Only published safe fields power `/gallery`, `/gallery/[slug]` and Ask Zara's public gallery knowledge.
- Unpublish and Trash remove the public projection immediately.
- Restore returns the item to Draft.

## Starter behavior
The three bundled campaign looks predate the admin database. Saving one as a private draft does not itself remove the currently published inspiration card. An explicit Unpublish or Trash action marks that starter as suppressed publicly. Publishing a managed replacement overlays the static starter with the safe Firestore projection.

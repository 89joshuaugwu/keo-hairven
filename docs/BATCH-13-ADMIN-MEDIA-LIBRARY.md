# Batch 13 — Admin Media Library

## Route
- `/admin/media`

## Source-of-truth review
This batch follows Admin route 08, the Media Library desktop/mobile frames, `SECURITY-AND-UPLOADS.md`, `DATA-MODEL.md`, `API-CONTRACTS.md`, the admin owner guide and the acceptance checklist.

## Implemented
- Central photo/video card library
- Search, filters, sorting and 24-item pagination
- Signed Cloudinary image/video uploads
- Accessible description, caption, provenance, generated flag and permission metadata
- Click-to-set focal point plus desktop/mobile crop previews
- Reference lookup across products, looks and services
- Safe replace while preserving media ID
- Reference-blocked Trash action
- Restore from Trash
- Owner-only permanent purge for unused trashed media
- Bundled static design assets shown as read-only starter records

## Safety
- Admin uploads do not accept SVG or arbitrary remote URLs.
- Images are capped at 8 MB; videos are capped at 20 MB and 10 seconds.
- Generated media cannot be labelled as Zara's real client work.
- Real client work requires confirmed permission.
- Actual product media is forced to non-generated metadata.
- Cloudinary API secrets remain server-only.
- Media deletion scans actual Product/Gallery/Service `mediaIds` instead of trusting only cached `uses` arrays.

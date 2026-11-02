# Batch 12 — Admin Services + Service Editor

## Routes
- `/admin/services`
- `/admin/services/new` → add-service editor state
- `/admin/services/[id]` → selected-service editor state

## Private/public data boundary
- Private drafts: `services`
- Public whitelist: `publicServices`
- Draft saves do not leak private fields to public pages.
- Publish writes a safe public projection and revalidates `/services` plus the service detail path.
- Unpublish/Trash removes the public projection immediately.
- Restore returns the item to draft.

## Starter service behavior
The supplied Braids & styling and Nail styling designs remain non-persistent starter records until an admin saves them. Saving one creates a private service record but does not hide the current public starter. Explicit Unpublish/Trash suppresses the starter. Publishing a managed replacement overrides the starter by public slug.

## Editor fields
- Service title
- Public slug
- Short customer-facing description
- Price display: Quote / Fixed / From / Range / Hidden
- Integer-kobo price values
- Preparation notes
- Service image + alt text
- Public-use-rights confirmation for new uploaded media

## Publish rules
- title required
- description required
- valid slug required
- valid price fields for selected mode
- new services require a usable image
- starter services may keep the supplied bundled inspiration image
- uploaded/real-work service media must have public-use permission
- public image requires alt text

## Uploads
Service uploads use Cloudinary folder `zara-luxe-strands/services`, server-side signing, JPG/PNG/WebP only, and an 8 MB application cap. The browser never receives the Cloudinary API secret.

## Public synchronization
`/services`, `/services/[slug]`, and Ask Zara now read the safe service projection. The appointment form remains enquiry-only and continues to use the branded Lagos-date calendar.

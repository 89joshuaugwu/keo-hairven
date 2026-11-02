# Batch 15 — Admin Business Details

## Included
- `/admin/settings` owner-managed Business Details workspace.
- `/api/admin/settings` authenticated read + owner-only mutation endpoint.
- `settingsDrafts/site.business` private editable fields.
- `publicSettings/site.business` safe public projection.
- Live customer preview and modal preview.
- Website Content Homepage/About media-card alignment refinement.

## Managed fields
- Brand name and tagline.
- WhatsApp number in validated E.164 format.
- General public location.
- Optional exact address.
- Optional owner-supplied opening-hours text.
- Waybill/delivery note.
- Optional Instagram and TikTok URLs.

## Behaviour and safety
- Business mutations are owner-only.
- The shared settings revision is checked optimistically before write, so a stale Business Details page conflicts instead of overwriting newer Website Content changes.
- Save writes private and public business data atomically.
- Optional blank fields are omitted from the public projection.
- The site never derives an “Open now” state from free-text hours.
- Public WhatsApp URLs use validated digits and encoded user-facing messages.
- The existing v14 server/client Firebase Admin boundary repair remains intact.

## Public propagation
Published Business Details feed the existing `PublicBusinessProvider`, which is already consumed by Header/Footer, Home/About location wording, Contact, shared WhatsApp actions, Product waybill guidance, Privacy and Ask Zara.

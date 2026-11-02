# Categories, rich Ask Zara replies, and 24-hour trash

## Intent and scope

Implement the user's approved category administration and rich chatbot replies,
with the requested change from indefinite trash retention to 24 hours.
Extend the existing Next.js/Firebase admin workflows and brand UI.
This is an architectural change because categories currently have fixed types
and validators, and automatic cleanup introduces a scheduled backend operation.

## Category management

Add `/admin/categories`, linked from admin navigation. Use separate product and
gallery groups, preserving existing IDs (`wigs`, `ponytails`, `attachments` for
products; `braids`, `wigs`, `nails` for gallery). Services currently use their
service titles as labels rather than a category assignment; FAQ groups remain
their existing navigation groups. Neither gets a new taxonomy in this change.

Store each group in a Firestore category registry, with stable IDs, editable
labels, ordered entries, and revision numbers. Initialize existing defaults once;
an explicitly empty stored group must never silently recreate deleted entries.
Expose public category reads through trusted server readers; browser Firestore
access remains denied. Editors and owners may create, rename, and reorder.
Only owners may delete. Reject blank/duplicate names within a group, invalid
IDs, and stale revisions. Category IDs do not change when labels change.

Pass registry options to product/gallery editors, list filters, public browsing
filters, and related category labels. Update private validation and public
projection readers to accept valid registry IDs instead of fixed unions.
Maintain existing item URLs and existing category filter URL values.

Deletion checks drafts, published, archived, and trashed assigned items, including
public projections. Reject deletion with a useful reference count until all
assignments are moved or permanently deleted. Coordinate category validation
and deletion through Firestore transactions so concurrent assignment cannot
introduce a dangling category. Renames display the new label for existing items.
Use registry-derived labels rather than stale embedded labels in projections.

## Rich chatbot replies

Extend the chat response contract with a bounded list of product cards. Each
contains product ID, title, authoritative price label, product URL, and optional
image/alt text. Resolve cards from the existing published catalogue and matching
helpers; never use model-generated image URLs, prices, or product identifiers
without resolving them against that catalogue. Exclude preview, draft, archived,
and trashed items. Limit cards to three relevant items per reply, including
specific-product followups and catalogue fallback replies. Missing images get
a compact text card rather than a broken image. Unrelated replies have no cards.

Render cards within Ask Zara using the existing brand styles, with accessible
image alt text, price wording, and product links. Preserve chat history's text
contract and existing action buttons. Close the chat when following internal
product links, consistent with current internal actions.

Render plain HTTP(S) URLs and Markdown links in replies as clickable links
without interpreting HTML. Validate protocols and restrict AI-authored targets
to internal pages, known catalogue URLs, and published business social/contact
links. Use published TikTok/Instagram values for social actions; do not invent
handles. Open external links with `noopener noreferrer`, preserve plain text
when a link is malformed or unsupported, and strip trailing sentence punctuation
from bare URL targets. Keep messages readable on narrow mobile screens.

## Trash retention and permanent deletion

Cover persisted products, services, gallery looks, FAQs, and media. Newly trashed
records receive server-controlled `deletedAt` and `purgeAt` timestamps, with
`purgeAt = deletedAt + 24 hours`. Repeated trash requests do not extend retention.
Restoring cancels expiry, clears deletion metadata, and returns content to draft
using existing revision checks; media uses its existing restored status.

Show a shared live countdown in all relevant trash lists, plus the absolute
deletion time. At expiry show "Awaiting cleanup" until the server confirms
deletion. A browser timer must never perform permanent deletion. Owners can
choose "Delete forever" with confirmation during the recovery window. Editors
can restore but cannot manually purge. Permanent purge removes any residual
public projections, private records, and related references atomically where
possible. Preserve audit logs and starter suppression markers so deleted starter
items do not reappear through fallback readers or the import workflow.

Introduce one shared purge service used by both owner routes and the scheduled
worker. Re-read status, revision, and expiry before claiming deletion; a restore
and a purge must not both succeed. Use a short-lived purge claim/lease to prevent
concurrent mutation during external asset deletion. Recover abandoned claims
without losing the original expiry. Restore remains available until a purge
claim wins; return a clear conflict when cleanup has already begun.

Deleting a product/service/look does not destroy its shared images. Media
purge requires a fresh reference check across all private/public consumers and
Website Content. Block referencing media with an active purge claim. Delete
unused media in Cloudinary before removing its Firestore metadata. On provider
failure keep metadata and retry on a later run. Referenced expired media stays
visible with a blocked reason until references are removed.

## Scheduling and rollout

Provide an authenticated cleanup endpoint for a scheduler, protected with a
server-only `TRASH_CRON_SECRET`. Do not expose the endpoint as a public browser
action. Recommend a scheduler invocation every five minutes. Expiry eligibility
is exactly 24 hours; actual deletion occurs on the next successful run and may
be delayed by scheduler outages or blocked media references. Local countdowns
alone do not establish an active production schedule.

Use bounded paginated batches and process content before media. Return only
aggregate deleted/blocked/failed counts, log outcomes, and make retries safe.
Document scheduler configuration independently of deployment provider; the
repository has Firebase rules configuration and Vercel references, but no
configured recurring job. Activating an external scheduler remains an explicit
deployment step, with concrete setup instructions and a readiness check.

For legacy trashed records, provide an owner-triggered migration assigning
expiry 24 hours from migration time so existing records are not immediately
purged at rollout. Show "Retention not started" for unmigrated legacy records.
Permanent owner deletion remains available for those records. Do not modify
live Firebase or Cloudinary data during local implementation or verification.

## Verification and acceptance

Run TypeScript checks and the production build. Add focused tests for category
reference conflicts and revision checks; card relevance and published-only data;
link parsing and unsafe schemes; expiry boundary, restore versus purge races,
legacy migration, scheduler authentication, retry behavior, and media references.
Use mocked provider calls for destructive cases. Review mobile chat cards,
category CRUD/reorder errors, and countdown/restore/delete states in the UI.

Completion requires integrated category administration, authoritative chatbot
cards and clickable links, consistent 24-hour trash UI and purge routes, and
documented scheduler activation. Clearly distinguish implemented cleanup code
from a production schedule that has actually been activated.

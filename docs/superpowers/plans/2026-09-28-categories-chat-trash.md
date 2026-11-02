# Categories, rich chat, and 24-hour trash implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution, or superpowers:subagent-driven-development if the user selects delegation. Track completed steps with checkboxes.

**Goal:** Deliver category administration, published-product cards and clickable links in Ask Zara, and recoverable trash with a 24-hour expiry.

**Architecture:** Keep category IDs stable in per-group Firestore registry documents. Enrich chat replies with catalogue-derived structured cards. Share a transactional trash/purge service between owner actions and an authenticated scheduled cleanup endpoint.

**Tech stack:** Next.js 16, React 19, TypeScript, Node 22, Firebase Admin, Cloudinary.

**Spec:** `docs/superpowers/specs/2026-09-28-categories-chat-trash-design.md`.

## Global constraints

- Preserve existing category IDs and item/filter URLs; manage product and gallery categories only.
- Browser Firestore access stays denied; all registry mutations use existing session and CSRF guards.
- Category deletion and manual permanent deletion require owner access.
- Chat cards use only published catalogue records; show at most three per reply.
- Trash expiry is exactly 24 hours after removal. A five-minute scheduler means physical deletion occurs on the next successful run.
- Preserve shared images, audit logs, and starter suppression markers.
- Legacy trash gets 24 hours from an owner-triggered migration.
- Verification must not mutate live Firebase/Cloudinary data or activate an external scheduler.

## Review focus

1. An intentionally empty registry must remain empty, including after reload or import (Task 1).
2. A category assignment racing with deletion must never produce a dangling reference (Task 2).
3. Markdown, trailing punctuation, and unsafe URL schemes must not produce dangerous or broken links (Task 4).
4. An expired browser countdown must not hide a failed purge or a still-referenced asset (Tasks 5–7).
5. Deleted starter content must not be resurrected by public fallbacks or reimport (Tasks 5–6).

## Task 1: Registry storage and shared category contract

**Files:** Create `lib/category-shared.ts`, `lib/categories-server.ts`, `tests/categories.test.ts`, `tsconfig.tests.json`. Modify `package.json`.

**Interfaces:** `CategoryGroup = "products" | "gallery"`; `CategoryEntry = {id:string; label:string}`; `CategoryRegistry = {group:CategoryGroup; revision:number; entries:CategoryEntry[]}`. `getCategoryRegistry(group): Promise<CategoryRegistry>` and `initialiseCategoryRegistry(group): Promise<CategoryRegistry>` live in the server module. Defaults live in the shared module.

- [ ] Add a test compilation script using existing TypeScript: compile tests and dependency-free domain helpers to a temporary ignored directory, then run Node's built-in test runner. Stub provider adapters for service tests; do not import client-forbidden modules into browser tests.
- [ ] Write failing tests: missing registry returns existing defaults; existing `entries:[]` stays empty; renaming `wigs` preserves its ID; trimming/case normalization rejects duplicate labels; reordered IDs must be a permutation with no additions or omissions.
- [ ] Run the category tests and confirm expected failures.
- [ ] Implement pure input validation in `category-shared.ts` and server storage in `categories-server.ts`, guarded by `server-only`. Store `categoryRegistries/products` and `categoryRegistries/gallery`; seed once in a transaction. Use cryptographically generated immutable IDs for new categories.
- [ ] Run category tests and TypeScript checks; confirm pass. Commit only Task 1 files.

## Task 2: Category mutation API and assignment integrity

**Files:** Create `app/api/admin/categories/[group]/route.ts`. Modify `lib/admin-products.ts`, `lib/admin-looks.ts`, product/look create, update, publish, and duplicate routes under `app/api/admin`, and `lib/site-setup.ts`. Extend `tests/categories.test.ts`.

**Interfaces:** `mutateCategoryRegistry(group, expectedRevision, operation, actor): Promise<CategoryRegistry>`; operation is create(label), rename(id,label), reorder(ids), or delete(id). Provide a shared transactional category-assignment check consumed by content writers.

- [ ] Write failing service tests using a transactional store adapter: editor delete is forbidden; referenced draft or trash blocks delete; stale revision fails; racing assignment versus deletion produces exactly one valid outcome; existing public projection prevents deletion even if its private record is missing.
- [ ] Run the tests and confirm expected failures.
- [ ] Add GET and guarded mutation handlers with existing `requireAdminApi(request,true)` and no-store responses. Return 400 for invalid input, 403 for forbidden role, and 409 for stale revision/in-use categories.
- [ ] Make category assignment and registry validation part of the same transaction. Read registry documents before writes, so concurrent registry changes retry validation. Deletion checks both private and public product/look collections within its transaction. Guard create/update/publish/duplicate/import paths; do not allow imports to reintroduce deleted IDs silently.
- [ ] Replace fixed category type unions with registry ID strings and accept existing unknown IDs when reading for repair, while validating new assignments through the registry. Test import against an intentionally empty registry.
- [ ] Run service tests and typecheck; commit Task 2 files.

## Task 3: Category admin screen, editors, and public filters

**Files:** Create `components/AdminCategoriesClient.tsx`, `app/admin/(workspace)/categories/page.tsx`, its `loading.tsx` and `error.tsx`. Modify `components/AdminWorkspaceShell.tsx`, `AdminProductEditor.tsx`, `AdminLookEditor.tsx`, `AdminProductsClient.tsx`, `AdminGalleryClient.tsx`, `ProductExplorer.tsx`, `GalleryExplorer.tsx`, corresponding server pages, `lib/public-products-server.ts`, `lib/public-looks-server.ts`, and `app/globals.css`.

**Interfaces:** Server pages pass serialized `CategoryRegistry` to client components. Public readers resolve labels from current registry entries; fixed legacy labels are fallback display text only for orphaned records needing repair.

- [ ] Use the frontend design skills at execution time to preserve existing admin/public visual patterns and record design context.
- [ ] Implement separate product/gallery groups, create/rename inputs, keyboard-accessible move up/down controls, owner delete confirmation, reference errors, saving/error/empty states, and registry revision refresh.
- [ ] Replace fixed options in editors and filters with ordered registry entries. Show a repair option for orphaned existing assignments; block saving until a valid category is selected. Keep “All” available when entries are empty.
- [ ] Update public readers to preserve valid new IDs and use current registry labels. Preserve filter query values across reload; unknown query categories resolve to “All.”
- [ ] Verify category changes propagate to existing items, filters, and chat context; inspect desktop/mobile layout and keyboard operation. Run typecheck and category tests; commit Task 3 files.

## Task 4: Catalogue cards and safe clickable chat text

**Files:** Create `lib/chat-presentation.ts`, `components/ChatRichText.tsx`, `tests/chat-presentation.test.ts`. Modify `app/api/chat/route.ts`, `components/AskZara.tsx`, `app/globals.css`.

**Interfaces:** `ChatProductCard = {id:string;title:string;priceLabel:string;href:string;image?:{src:string;alt:string}}`; `selectChatCards(message,history,products): ChatProductCard[]`. `parseChatLinks(text,allowedUrls): Array<{text:string;href?:string}>` returns safe text/link segments. Share response types through `chat-presentation.ts` without server imports.

- [ ] Write failing tests asserting zero cards for unrelated asks, exclusion of preview/draft items, at most three cards, authoritative price labels, specific product followups, and no fabricated image URLs. Test bare and Markdown URLs, punctuation, `javascript:`/`data:` rejection, protocol-relative links, host lookalikes, and malformed Markdown.
- [ ] Run tests and confirm expected failures.
- [ ] Enrich all successful deterministic, guarded, primary, and backup reply branches through one response-presentation helper. Reuse existing product reference/topic helpers and existing authoritative pricing formatter. Use only products in the loaded published knowledge.
- [ ] Provide known internal paths/catalogue URLs and exact published business social/contact targets to the link parser. Include TikTok/Instagram actions for relevant questions using business settings. Render plain text if the model emits an unapproved target.
- [ ] Render compact cards and safe link segments in Ask Zara, preserving text-only API history and existing action buttons. Use accessible images, text fallback without media, responsive sizing, and existing internal-link close behavior.
- [ ] Run tests/typecheck and inspect chat cards, followups, text wrapping, and external-link behavior on desktop/mobile; commit Task 4 files.

## Task 5: Shared trash lifecycle and atomic purge service

**Files:** Create `lib/trash-shared.ts`, `lib/trash-server.ts`, `tests/trash.test.ts`. Modify trash/restore routes under products, services, looks, media; `app/api/admin/content/route.ts`; shared record types and serialization in `admin-product-shared.ts`, `admin-service-shared.ts`, `look-admin-shared.ts`, `admin-media-shared.ts`, `site-content.ts`, and their server readers.

**Interfaces:** `TrashKind = "products"|"services"|"looks"|"faqs"|"media"`; metadata `deletedAt?:number; purgeAt?:number; purgeState?:"blocked"|"failed"|"claimed"`. `trashRecord(kind,id,expectedRevision,actor)`, `restoreRecord(kind,id,expectedRevision,actor)`, and `purgeRecord(kind,id,{actor,expectedRevision?,onlyExpired:boolean}): Promise<"deleted"|"blocked"|"failed"|"skipped">`. Pure expiry calculation uses `TRASH_RETENTION_MS = 86400000`.

- [ ] Write failing tests with fake clock/storage/Cloudinary adapters: expiry at 86,400,000 ms; repeated trash preserves expiry; restore clears expiry and returns draft; stale revision fails; purge/restore race has one winner; live or not-yet-expired record is skipped by the worker; editor manual purge is forbidden.
- [ ] Add tests for media reference blocking, provider failure preserving metadata, abandoned claims recovering, and referenced shared images surviving content purge. Test persistent starter suppression after purge and reimport.
- [ ] Run tests and confirm expected failures.
- [ ] Implement common transactional lifecycle operations and an expiring purge lease. Only purge trashed records. Reject reference mutations involving claimed media. Destroy unused Cloudinary assets before final metadata removal; keep failed metadata for retries and audit outcomes. Protect restored records from previously queued workers.
- [ ] Persist suppression markers outside the deleted starter record and consume them in fallback/public/import paths. Delete residual public projections along with private content; preserve unrelated media and audit records.
- [ ] Wire existing trash/restore and content FAQ updates through the shared lifecycle. Preserve revision/CSRF protections. Add owner `?purge=1` support to content record DELETE routes and `app/api/admin/faqs/[id]/route.ts` for FAQ restore/purge actions.
- [ ] Run trash tests and typecheck; commit Task 5 files.

## Task 6: Cleanup endpoint and legacy migration

**Files:** Create `app/api/cron/trash/route.ts`, `app/api/admin/trash/migrate/route.ts`, `lib/trash-cleanup.ts`, `tests/trash-cleanup.test.ts`. Modify `.env.example`, `.gitignore`, and `README.md`.

**Interfaces:** `runTrashCleanup({now,limit}): Promise<{deleted:number;blocked:number;failed:number;skipped:number}>`, default limit 100 total records per invocation. `migrateLegacyTrash(actor,now,limit): Promise<{migrated:number;remaining:boolean}>`. Process content before media; use indexed expiry pagination rather than unbounded collection reads.

- [ ] Write failing tests: missing/invalid cron secret is denied; worker counts and batch limits are accurate; pagination never skips due records; retries are safe; migration touches only trashed records lacking expiry and sets `purgeAt=now+86400000`; repeated migration preserves expiry.
- [ ] Run tests and confirm expected failures.
- [ ] Implement a Node-runtime GET endpoint using constant-time Bearer-secret comparison and no-store aggregate responses. When secret is unconfigured return an unavailable response and never run cleanup. Supply mocked services to route tests.
- [ ] Implement owner/CSRF guarded migration endpoint and paginated bounded cleanup through Task 5's service. Add needed Firestore index declarations/configuration if the chosen queries require them.
- [ ] Document a five-minute authenticated external scheduler, its header, failure monitoring, and deployment readiness check. Add blank `TRASH_CRON_SECRET` to the example; do not write secrets into documentation or enable a live schedule.
- [ ] Run cleanup tests/typecheck; commit Task 6 files.

## Task 7: Countdown, restore, permanent-delete, and migration UI

**Files:** Create `components/TrashCountdown.tsx`, `components/AdminTrashActions.tsx`. Modify `AdminProductsClient.tsx`, `AdminServicesClient.tsx`, `AdminGalleryClient.tsx`, `AdminContentEditor.tsx`, `AdminMediaLibraryClient.tsx`, relevant server pages to pass role, `AdminOverviewContent.tsx`, and `app/globals.css`.

**Interfaces:** `TrashCountdown({purgeAt,purgeState})` refreshes every second and cleans up its timer. `AdminTrashActions({kind,id,revision,role,onChange})` uses `adminFetch`, confirmation, and clear conflict/provider errors.

- [ ] Implement countdown with absolute local deletion time, “Awaiting cleanup” at expiry, “Retention not started” for legacy records, and explicit blocked/failed media state. Do not delete or hide records based on the timer alone.
- [ ] Add Restore and owner-only Delete forever to persisted trashed content, preserving media reference warnings. Refresh records after mutations and display stale-revision conflicts. Keep local unsaved FAQ removals separate from persisted expiry until the save succeeds.
- [ ] Add owner migration control with confirmation, progress through batches, and a visible explanation of the fresh 24-hour window. Explain whether the production scheduler has been configured; never claim it is active from secret presence alone.
- [ ] Verify five trash views, owner/editor differences, legacy display, failed requests, countdown expiry, and mobile layout. Run typecheck and trash tests; commit Task 7 files.

## Task 8: Integration verification and handoff

**Files:** Modify `README.md`, `CHANGELOG.md`, and the project design context file maintained by UI skills.

- [ ] Run all domain/provider-mocked tests, `npm run typecheck`, and `npm run build` in `zarals-web`. Use placeholder environment for build checks so no live admin/customer data is mutated; report any build/network limitations precisely.
- [ ] Review integrated category assignments and labels through editor, public browse, and chat; confirm trashed products cannot generate cards.
- [ ] Review desktop/mobile category controls, chat links/cards, and trash actions. Correct material regressions and repeat only affected checks.
- [ ] Document local verification, category initialization, owner legacy migration, and scheduler activation. State that cleanup cannot occur automatically until an external job is active.
- [ ] Commit the completed changes, provide a concise handoff with evidence and remaining deployment steps, and leave external deployment/scheduler activation pending unless explicitly authorized.

## Implementation outcome - 2026-09-29

Implemented all three approved features in the existing IDE workspace on `feat/categories-rich-chat-trash`. Category registries connect admin controls, editors, public filters and chat labels. Rich chat uses published catalogue cards and approved business links. Shared trash services provide a 24-hour recovery window, transactional restore/purge guards, media reference protection, durable starter suppression, bounded legacy migration and authenticated cleanup.

Implementation deviations: related tasks were integrated before one final commit rather than committed separately. Migration is an owner operation on `/api/admin/trash`; Node-native tests are grouped in `tests/domain.test.ts` and `tests/services.test.mts`. Cleanup uses single-field expiry queries with document-ID ordering and durable cursors. Production scheduler activation remains a deployment step documented in README.

Verification: all 26 domain/provider-mocked tests passed; TypeScript passed; the production build passed with invalid Firebase credentials to avoid live data changes. Read-only review findings were fixed, including import/restore races, historical service media references, starter suppression, and missing media validation. Browser visual checks could not run because no browser surface was available; desktop/mobile visual review remains outstanding. No deployment or live cleanup was performed.

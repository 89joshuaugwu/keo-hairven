# KEO Hairven interaction contract

## Authority and ownership

Business/permissions: `lib/admin-auth.ts`, `lib/admin-api.ts`, `lib/admin-session.ts`. Product publishing: `lib/admin-products.ts`, `lib/admin-product-shared.ts`. Media lifecycle/trash: `lib/trash-server.ts`, `lib/admin-media.ts`. AI settings: `lib/admin-ai.ts`; public reply orchestration: `lib/muse-core.ts`, `lib/muse-server.ts`. No UI bypasses these server rules.

Visual intent: `DESIGN.md`. Public tokens: `app/editorial.css`; admin adapter: `app/studio.css`; dialog/chat: `app/muse.css`.

## Canonical UI map

| Capability | Owner | Contract |
| --- | --- | --- |
| Public route navigation | SiteHeader | Native links, active-page label, skip link, keyboard-accessible mobile overlay |
| Authenticated navigation | AdminWorkspaceShell | Session-protected shell; owner labels for restricted tools; native modal mobile menu |
| Modal overlays | ModalDialog | Native dialog top layer, inert background, Escape, focus restoration, body scroll lock; short reduced-motion-aware exit |
| Permanent deletion | AdminConfirmDialog | Consequence and explicit verb, least-destructive initial focus, server role/revision checks |
| Single selection | BrandSelect | Authored listbox, arrow/Home/End/typeahead keys, Escape and selection restore trigger focus; popup opens up when needed |
| Unsaved edits | UnsavedChangesGuard | In-app link discard dialog, actual unload warning; preserve fields on save failures. Browser history traversal is not intercepted |
| AI conversation | KeoMuse | Visible AI identity; async pending/stop/retry; new conversation; bounded history; explicit saved-answer mode; verified server-authored action links |
| Public search | FaqAccordion / GalleryExplorer | Immediate local filtering, explicit clear, no-results recovery; sensitive free text is not added to URLs |
| Product browsing | ProductExplorer | Existing category/sort query parameters; empty catalogue is honest; enquire only for published options |
| Admin notifications | Existing feature feedback regions | Persistent text beside owning flow; no native alert/confirm/prompt; errors preserve user edits |

## Flow ledger

- Enquiry: compose → validate → open WhatsApp → user reviews/sends there. No order/payment success state on this site.
- Product/look: create draft → save → review → publish; owner-confirmation/provenance validation remains server-owned. Trash/restore remains the existing revision-checked workflow.
- Settings/content: save/publish with revision → success feedback; stale revision → preserve edits and request refresh. New navigation guard covers ordinary in-app links and unload.
- AI: validate request → read approved public context → atomically reserve provider attempt → bounded Gemini request → plain text plus server links; any unavailable/limited provider → labelled saved-answer fallback.
- Admin connection: masked input → encrypt/test on server → masked hint only; no key in URLs or logs. Host-level key is shown only as configured/unconfigured.
- Owner setup: environment presence checks → publish actual content → manual external-provider smoke test. Never equate presence with connected.

## Audience and accessibility

English-speaking Nigerian customers; NGN catalogue prices; Lagos daily AI usage boundary. Native date fields, where retained in retired service flows, use the platform popup. Reduced-motion preferences remove decorative motion; controls remain usable without hover. Essential content remains visible without reveal enhancement. Dense admin copy uses DM Sans rather than marketing display type.

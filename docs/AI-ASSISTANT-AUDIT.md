# AI assistant audit — 1 November 2026

## Finding
The cloned assistant is still present in the uploaded project, but the public replying path was deliberately disconnected before this redesign. It is more than a hidden launcher: the public POST endpoint is disabled too. This finding is based on the current uploaded code, not assumptions about the previous site.

| Area | Current source | Status |
| --- | --- | --- |
| Public chat interface | `components/AskZara.tsx` | Complete inherited widget branded Ask KEO; no public route/layout imports or renders it. |
| Reply endpoint | `app/api/chat/route.ts` | POST unconditionally returns HTTP 503 and an unavailable message. It does not call a model. |
| Public configuration | `app/api/chat/config/route.ts`, `lib/admin-ai.ts:getPublicAiConfig` | Still returns saved/default welcome/enabled configuration. An enabled config alone cannot restore chat. |
| Owner management | `app/admin/(workspace)/ai/page.tsx`, `components/AdminAiManager.tsx` | Owner-only page, connection controls and test UI remain. |
| Provider connection code | `lib/admin-ai.ts` | Gemini connection testing, server-side encrypted key storage, runtime settings and daily usage support remain. |
| Answer presentation | `components/ChatRichText.tsx`, `components/ChatProductCard.tsx`, `lib/chat-presentation.ts` | Message formatting, controlled links and product-card helpers remain. |

The previous HANDOFF.md explicitly stated that the inherited public AI assistant and launcher were disabled. That earlier handoff is preserved at `docs/HANDOFF-before-editorial-upgrade.md`. Byte comparison confirmed that AskZara.tsx, the disabled reply endpoint and admin-ai.ts are unchanged from the user's original upload.

## Consequences
- Visitors cannot open a chat from the current public pages.
- Simply adding the widget back would display an interface whose messages still receive HTTP 503.
- Simply turning the admin enabled switch on cannot bypass the disabled endpoint.
- The default model identifier is `gemini-2.5-flash-lite`; the code also allows configurable model identifiers. No live provider connection or credentials were tested.

## Scope of this task
The user asked to check whether it exists, so this redesign preserves the disabled state and all inherited AI files. No provider key, Firestore setting, billing/cap configuration or public enablement was changed.

To restore this feature later, reconnect a public widget, implement the disabled reply handler with existing runtime settings and published-content context, retain input validation/rate limits and safe reply links, and verify configured encrypted provider connections plus fallback/error behavior. That is a separate functional restoration, not a CSS visibility change.

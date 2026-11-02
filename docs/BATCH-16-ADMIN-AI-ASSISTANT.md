# Batch 16 — Admin AI Assistant Management

## Included
- Owner-only `/admin/ai` workspace.
- Public Ask Zara enabled state and welcome message controlled from Admin.
- Gemini connections added/replaced/disabled/deleted from Admin.
- Per-connection Gemini model ID and priority.
- Daily AI request cap stored in Firestore and editable from Admin.
- Connection Test and grounded Test Reply.
- Saved-answer/WhatsApp fallback preview.
- Usage-today indicator based on the shared Firestore daily counter.

## Secret handling
- Raw Gemini keys are write-only.
- Keys are encrypted server-side using AES-256-GCM before Firestore storage.
- The browser receives only a masked key hint.
- `AI_KEYS_ENCRYPTION_KEY_BASE64` is the only AI-specific deployment secret needed after setup.
- Legacy Gemini connection/model/request-cap ENV entries are no longer runtime configuration sources.

## Public assistant behavior
- `/api/chat` loads enabled connections, model IDs and daily cap from the managed Firestore configuration.
- It uses the first enabled connection by priority.
- It may try one alternate only for server/provider failures, never to bypass a 429 shared-project quota.
- Deterministic FAQ/business answers remain available without a model call.
- If AI is disabled/unavailable, the visitor receives saved answers and WhatsApp handoff.

## UI refinements in this batch
- Website Content desktop media cards now use the same aligned two-column geometry as Business Details and no longer float over the sticky save controls.
- Ask Zara's desktop launcher and chat panel are visually reduced to about 82% of the previous footprint. Mobile remains full-size for usability.

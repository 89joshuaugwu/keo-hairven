# Batch 07 — Ask Zara AI + purposeful video refinement

## Ask Zara public assistant
- Replaced the WhatsApp-only placeholder with the complete public Ask Zara chat interface.
- Public UI includes the branded Zara icon badge, session-only conversation, suggested prompts, clear chat, saved-answer fallback, waiting state, safe internal links and WhatsApp handoff.
- The launcher and panel use the icon-only Zara mark inside a rounded white badge; the generic star mark is no longer used.
- Before the first message the panel identifies itself as an AI guide, links Privacy and warns users not to share sensitive information.
- Raw chat transcripts are not written to Firestore by this implementation. Messages live only in the open page session.

## Server chat route
- `POST /api/chat`
- Message cap: 1000 characters.
- Context cap: 6 recent turns.
- Deterministic answers handle common location, hours, waybill, appointment, gallery-provenance and sample-product questions without using an AI request.
- Other approved public business questions use the configured Google Gemini API.
- AI output is rendered as plain text only.
- Server actions/links are application-controlled rather than trusted from the model.
- The route checks request origin and never exposes API keys to the browser.
- Firebase Admin/Firestore supplies shared daily/caller abuse counters before a Gemini call. If the server-side Firebase credential is unavailable, Ask Zara falls back instead of sending an unprotected AI request.
- Primary Gemini connection may use one configured alternate only for server/provider failures. It does not rotate keys on quota/429 responses.

## Firebase Admin setup
Preferred production values in `.env.local` / deployment secrets:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Local development can alternatively read `zara-luxe-strands-firebase-adminsdk.json` from the project root. That filename is Git-ignored and is never included in handoff ZIPs.

## Gemini setup
- Gemini API keys, model IDs and the daily request cap are now managed from the owner-only `/admin/ai` workspace.
- `AI_KEYS_ENCRYPTION_KEY_BASE64` remains server-only and is used to encrypt saved API keys at rest.

## Purposeful video map
The site deliberately does not turn every image into motion.
- Home hero → `01-hero-hair.mp4`
- Home nail editorial → `02-nail-details.mp4`
- Home collection editorial → `03-hair-collection.mp4`
- Gallery braid media + Hair Services family section → `04-braid-detail.mp4`
- Dark WhatsApp CTA → `05-blush-satin.mp4`
- About brand story → `06-shopping-bag.mp4`, with the original bag photo retained as poster/fallback

Product cards/details remain static because the current products are sample previews and motion could imply a more specific real item. Contact, FAQ and Privacy remain primarily static for readability and task focus.

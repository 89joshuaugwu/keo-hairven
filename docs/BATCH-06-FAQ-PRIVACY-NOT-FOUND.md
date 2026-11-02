# Batch 06 — FAQ + Privacy + Not Found

## Routes
- `/faq`
- `/privacy`
- root `not-found.tsx` for unknown/unpublished routes

## FAQ
The FAQ page follows the supplied desktop/mobile design and uses the confirmed factual fallback answers from the handoff. It includes:
- deep-linkable question IDs (`#faq-1` through `#faq-7`)
- desktop category navigation
- accessible accordion buttons with `aria-expanded` and `aria-controls`
- all answer copy kept in the rendered HTML
- WhatsApp CTA fallback

No refund, return, payment-policy or guaranteed-delivery claims were added.

A later admin/Firebase batch can replace `lib/faqs.ts` with owner-published FAQ projections without changing the page interaction model.

## Privacy
The original handoff contains a draft privacy notice, not a legal certification. This implementation updates the wording to match the current public code:
- public browsing does not require a customer account
- current app code does not intentionally set analytics/marketing cookies
- ordinary hosting/security request logs may still exist at the hosting provider
- Firebase is prepared for authorised admin authentication; the current public Contact/FAQ pages do not write customer enquiries to Firestore
- WhatsApp messages are composed locally and are not sent until the visitor chooses to continue to WhatsApp
- Ask Zara currently does not call Gemini or another AI provider
- Cloudinary/public visitor uploads are not active in this build
- raw customer chat transcripts are not stored by the current public app

Review Privacy again when admin sessions, Firestore, Cloudinary uploads, Gemini, analytics, or any new customer-data flow becomes active.

## 404
The previous minimal fallback has been replaced with the supplied branded 404 experience:
- normal site header and footer
- “This look has left the gallery.” recovery copy
- Gallery recovery CTA
- WhatsApp recovery CTA
- Ask Zara launcher

Next.js `notFound()` and unknown App Router routes use the framework 404 response rather than returning a successful error page.

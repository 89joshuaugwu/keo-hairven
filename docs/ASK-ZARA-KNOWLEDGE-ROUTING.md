# Ask Zara — Knowledge and routing

## Knowledge source
Ask Zara answers from the current published Firestore projections used by the public website: business details, products, services, gallery looks and FAQs. Product preview/code fixtures are not used as product knowledge.

## Routing
The request layer resolves high-confidence customer questions before an AI call when possible. Matching is token-based rather than substring-based. Product lengths are treated as identity-critical, so a question about a 14-inch item cannot resolve to the 12-inch version just because the rest of the title is similar.

Recent user turns are used only for referential follow-ups such as “how much is it?” or “what about the 16-inch?”. Unrelated new questions do not inherit an older product merely because it appeared earlier in the chat.

Multi-part operational questions such as ordering + waybill are answered together. Ambiguous catalogue questions list matching options or ask for clarification instead of guessing.

## Gemini
Gemini receives the same approved public snapshot plus recent bounded conversation history. The system instruction requires it to answer every sub-question, never substitute a different product length, avoid invented stock/booking/delivery/payment facts, and use WhatsApp handoff when the public data is not enough.

## Privacy
The app does not persist raw public chat transcripts. Shared rate-limit counters and connection health metadata may be stored as documented elsewhere in the project.

## v18.7 hardening
- Exact product resolution now happens before generic operational routing, so product + order/waybill questions keep the requested item and still answer the other parts.
- Bare numeric follow-ups such as “what about 16?” are accepted only when recent user history clearly establishes a product context.
- Questions naming multiple lengths are treated as multi-product/comparison questions rather than being collapsed to the first length.
- Deterministic service matching handles common price/availability questions for braids and nails before a Gemini call.
- A post-generation product-length guard rejects an obvious Gemini length substitution and falls back to the verified catalogue record.

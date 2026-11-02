# Ask Zara intelligence pass

## Why this pass was needed
The earlier chat route used broad substring matching and returned the first product that shared any long word with the question. That caused two visible failures:

- a 14-inch price question could return the 12-inch product because all three titles contain `soft`, `Swiss`, `lace` and `ponytail`;
- `place an order` could accidentally match the product token `lace` because `place` contains the characters `lace`.

The FAQ matcher also accepted a single overlapping word, which could make a multi-topic question answer only one part.

## New routing
1. Sensitive/private-data requests are rejected.
2. Multi-topic questions are sent to Gemini so all parts can be answered together.
3. Product queries use exact lengths plus whole-token scoring.
4. Direct public facts (location, hours, waybill, appointments, ordering, contact) use deterministic answers.
5. FAQ matching requires stronger overlap.
6. Remaining questions use Gemini with up to 10 recent turns and the full current published public context.

## Grounding
Ask Zara reads only approved public Products, Services, Gallery looks, FAQs and Business Details. The prompt explicitly requires exact sizes/prices, all parts of multi-topic questions, and current-question priority over stale conversation context.

## Useful production tests
- `How much is the 14-inch soft Swiss lace and ponytail?` -> 14-inch / ₦50,000.
- `What about the 16-inch one?` -> 16-inch / ₦55,000.
- `How do I place an order and do you do waybill?` -> answers both ordering and waybill.
- `What are your common FAQs?` -> lists current FAQ topics.
- `Where are you located and what time do you open?` -> answers both from Business Details without inventing missing hours/address.

# Ask Zara intelligence QA — v18.7

This pass is focused on routing correctness, not model "training". Ask Zara first resolves high-confidence facts from the current published website data, then uses Gemini for open-ended questions with the same bounded public context.

## Production smoke questions
Use these after deployment. Expected wording can vary, but the facts and routing must match.

| Test | Expected behaviour |
| --- | --- |
| `How much is 14-inch soft Swiss lace and ponytail?` | Must answer the 14-inch record and its price; must not substitute 12-inch or 16-inch. |
| `How much is it?` after asking about 14-inch | Must retain the 14-inch product. |
| `What about 16?` after asking about a product | Must move to the 16-inch product if exactly one 16-inch record exists. |
| `Compare 12-inch and 14-inch` | Must treat them as two products, not collapse to the first length. |
| `Can I order the 14-inch and do you waybill?` | Must answer the 14-inch product plus ordering and waybill in the same reply. |
| `How do I place an order and do you guys do waybill?` | Must answer both order and delivery; must not inherit an older product. |
| `What are the frequently asked questions?` | Must list current FAQ questions; must not answer an old product. |
| `Do you do braids and how much?` | Must use the current Braids & styling service and its published price mode. |
| `Where are you and what time do you open?` | Must answer both location and hours/availability. |
| `What products do you have?` | Must list the current published catalogue and prices. |

## Guard rails
- A new topic does not inherit an older product merely because it appeared earlier in the chat.
- Assistant messages that list several products are not used as a hidden product-selection source for `it`/`that one` follow-ups.
- One explicit length is treated as identity-critical.
- Two or more explicit lengths are treated as a comparison/multi-product question.
- Gemini output is checked for obvious one-length substitution before it reaches the visitor.
- Missing stock, delivery cost/timing, payment confirmation and booking slots are never invented.

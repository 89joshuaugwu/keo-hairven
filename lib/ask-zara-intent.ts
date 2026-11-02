import type { BrowseProduct } from "@/lib/products";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "can", "could", "do", "does", "for", "from", "have", "how",
  "i", "in", "is", "it", "me", "my", "of", "on", "or", "our", "please", "the", "this", "to", "we", "what",
  "when", "where", "which", "with", "you", "your", "zara", "luxe", "strands",
]);

export type AskZaraIntent =
  | "products"
  | "order"
  | "delivery"
  | "appointment"
  | "location"
  | "hours"
  | "services"
  | "gallery"
  | "contact"
  | "social"
  | "faq";

export function normaliseAskZaraText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9+@.'"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function askZaraTokens(value: string) {
  return normaliseAskZaraText(value)
    .replace(/[-.'"@+]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function meaningfulAskZaraTokens(value: string) {
  return askZaraTokens(value).filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function extractAllLengthsInches(value: string): number[] {
  const text = normaliseAskZaraText(value);
  const values = [...text.matchAll(/\b(\d{1,3})\s*(?:-\s*)?(?:inch(?:es)?|in\b|["”])/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  return [...new Set(values)];
}

export function extractLengthInches(value: string): number | null {
  return extractAllLengthsInches(value)[0] ?? null;
}

/**
 * Supports terse follow-ups such as “what about 16?” without treating every
 * number (price, date, quantity) as a product length. This is intentionally
 * only used when the wording is referential and recent history is product-led.
 */
export function extractBareLengthFollowup(value: string): number | null {
  const text = normaliseAskZaraText(value);
  if (!/\b(what about|how about|and|the|try|maybe|is|for)\b/.test(text) && !/^\d{1,3}\??$/.test(text)) return null;
  const matches = [...text.matchAll(/\b(\d{1,3})\b/g)].map((match) => Number(match[1])).filter((value) => value >= 6 && value <= 60);
  return matches.length === 1 ? matches[0] : null;
}

function productLength(product: BrowseProduct) {
  return extractLengthInches(product.title);
}

function titleTokenSet(product: BrowseProduct) {
  return new Set(meaningfulAskZaraTokens(product.title));
}

function tokenOverlap(product: BrowseProduct, message: string) {
  const productTokens = titleTokenSet(product);
  const queryTokens = new Set(meaningfulAskZaraTokens(message));
  let overlap = 0;
  for (const token of queryTokens) if (productTokens.has(token)) overlap += 1;
  return overlap;
}

export function isProductReferentialFollowup(message: string) {
  const m = normaliseAskZaraText(message);
  if (extractLengthInches(m) != null) return false;
  return /\b(it|that|this|that one|this one|the one|same one|what about|how about|how much|price|cost|available|availability|in stock)\b/.test(m)
    || /^\d{1,3}\??$/.test(m);
}

function productHistoryIsRelevant(history: { role: "user" | "assistant"; text: string }[], products: BrowseProduct[]) {
  for (let index = history.length - 1; index >= Math.max(0, history.length - 4); index -= 1) {
    const turn = history[index];
    if (turn.role !== "user") continue;
    if (findProductMention(products, turn.text) || detectAskZaraIntents(turn.text).has("products") || isCatalogueQuestion(turn.text)) return true;
  }
  return false;
}

export function findProductMention(products: BrowseProduct[], text: string): BrowseProduct | null {
  const explicitLengths = extractAllLengthsInches(text);
  // A comparison such as “12-inch vs 14-inch” is not a single product mention.
  // Let the higher-level reasoning path answer it with the full catalogue context.
  if (explicitLengths.length > 1) return null;
  const explicitLength = explicitLengths[0] ?? null;
  if (explicitLength != null) {
    const sameLength = products.filter((product) => productLength(product) === explicitLength);
    if (sameLength.length === 1) return sameLength[0];
    if (sameLength.length > 1) {
      const ranked = sameLength
        .map((product) => ({ product, score: tokenOverlap(product, text) }))
        .sort((a, b) => b.score - a.score);
      if (ranked.length === 1 || ranked[0].score > ranked[1].score) return ranked[0].product;
      return null;
    }
    return null;
  }

  const normalised = normaliseAskZaraText(text);
  const exactTitle = products.find((product) => normalised.includes(normaliseAskZaraText(product.title)));
  if (exactTitle) return exactTitle;

  const scored = products
    .map((product) => ({ product, overlap: tokenOverlap(product, text) }))
    .sort((a, b) => b.overlap - a.overlap);
  const best = scored[0];
  const second = scored[1];
  if (!best || best.overlap < 2) return null;
  if (second && second.overlap === best.overlap) return null;
  return best.product;
}

export function resolveProductReference(products: BrowseProduct[], message: string, history: { role: "user" | "assistant"; text: string }[]) {
  const current = findProductMention(products, message);
  if (current) return current;

  const bareLength = extractBareLengthFollowup(message);
  if (bareLength != null && productHistoryIsRelevant(history, products)) {
    const sameLength = products.filter((product) => productLength(product) === bareLength);
    if (sameLength.length === 1) return sameLength[0];
  }

  if (!isProductReferentialFollowup(message)) return null;

  // Only infer the product from prior USER turns. Assistant catalogue answers can
  // mention several lengths at once and must never make “it” resolve to the first.
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role !== "user") continue;
    const match = findProductMention(products, turn.text);
    if (match) return match;
  }
  return null;
}

function hasAny(text: string, expressions: RegExp[]) {
  return expressions.some((expression) => expression.test(text));
}

export function detectAskZaraIntents(message: string): Set<AskZaraIntent> {
  const m = normaliseAskZaraText(message);
  const intents = new Set<AskZaraIntent>();

  if (hasAny(m, [
    /\b(products?|wigs?|ponytails?|attachments?|hair products?|items?)\b/i,
    /\bwhat (?:do|have) you (?:sell|have)\b/i,
    /\bwhat'?s available\b/i,
  ])) intents.add("products");

  if (hasAny(m, [
    /\b(order|orders|ordering|buy|buying|purchase|purchasing)\b/i,
    /\bplace (?:an )?(?:order|oder)\b/i,
    /\bhow do i place\b/i,
    /\bhow (?:can|do) i (?:get|buy)\b/i,
  ])) intents.add("order");

  if (hasAny(m, [
    /\b(waybills?|delivery|deliver|delivering|shipping|ship)\b/i,
    /\bsend (?:it|this|that|one|the item) to\b/i,
  ])) intents.add("delivery");
  if (hasAny(m, [/\b(appointment|appointments|booking|book|slot|slots)\b/i])) intents.add("appointment");
  if (hasAny(m, [/\b(location|located|address|where are you|where is your shop|where is the shop)\b/i])) intents.add("location");
  if (hasAny(m, [/\b(opening hours?|closing|close|open now|what time|hours?)\b/i])) intents.add("hours");
  if (hasAny(m, [/\b(services?|braids?|braiding|nails?|manicure|styling)\b/i])) intents.add("services");
  if (hasAny(m, [/\b(gallery|looks?|styles?|inspiration)\b/i])) intents.add("gallery");
  if (hasAny(m, [/\b(contact|phone|number|whatsapp|reach you|reach zara|your boss|boss)\b/i])) intents.add("contact");
  if (hasAny(m, [/\b(instagram|tiktok|social media|socials?)\b/i])) intents.add("social");
  if (hasAny(m, [/\b(faq|faqs|frequent(?:ly)? asked questions?|frequent questions?|common questions?)\b/i])) intents.add("faq");

  return intents;
}

export function isCatalogueQuestion(message: string) {
  const m = normaliseAskZaraText(message);
  if (/\bwhat (?:do|have) you (?:sell|have)\b/.test(m)) return true;
  return /\b(what|which|show|list|see|have|sell|available)\b/.test(m)
    && /\b(products?|wigs?|ponytails?|attachments?|items?)\b/.test(m);
}

export function isProductPriceOrAvailabilityQuestion(message: string) {
  const m = normaliseAskZaraText(message);
  return /\b(price|prices|cost|how much|available|availability|stock|in stock|do you have)\b/.test(m);
}

export function isGreetingOrCapabilityQuestion(message: string) {
  const m = normaliseAskZaraText(message);
  return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(m)
    || /\b(what can you do|what can i ask|how can you help|help me)\b/.test(m);
}

export function matchingProductsByTopic(products: BrowseProduct[], message: string) {
  const queryTokens = new Set(meaningfulAskZaraTokens(message));
  return products.filter((product) => {
    const titleTokens = titleTokenSet(product);
    const category = product.category || "";
    const categoryTokens = new Set(meaningfulAskZaraTokens(`${category} ${product.categoryLabel||""}`));
    for (const token of queryTokens) {
      if (titleTokens.has(token) || categoryTokens.has(token)) return true;
      if (token === "wig" && category === "wigs") return true;
      if (token === "ponytail" && category === "ponytails") return true;
      if (token === "attachment" && category === "attachments") return true;
    }
    return false;
  });
}

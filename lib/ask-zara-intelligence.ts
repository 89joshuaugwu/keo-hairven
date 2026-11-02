export type AskZaraIntent =
  | "products"
  | "order"
  | "delivery"
  | "appointment"
  | "location"
  | "hours"
  | "services"
  | "gallery"
  | "faq"
  | "contact";

export type AskZaraProductLike = {
  id: string;
  slug: string;
  title: string;
  priceMinor?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  priceMode?: string;
  availability?: string;
};

const STOP_WORDS = new Set([
  "the", "and", "you", "your", "can", "are", "how", "what", "where", "does", "all", "for", "with", "this", "that", "have", "much", "price", "cost", "please", "want", "need", "about", "tell", "me", "is", "do", "a", "an", "to", "of", "in", "on", "it", "we", "i", "my", "our", "your", "inch", "inches",
]);

export function normalizeAskZaraText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[_–—]/g, "-")
    .replace(/(\d)\s*-\s*inch(?:es)?\b/g, "$1 inch")
    .replace(/[^a-z0-9+'\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function askZaraTokens(value: string) {
  return normalizeAskZaraText(value)
    .split(/[\s-]+/)
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

export function meaningfulAskZaraTokens(value: string) {
  return askZaraTokens(value).filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function extractProductLengths(value: string) {
  const normalized = normalizeAskZaraText(value);
  const lengths = new Set<number>();
  for (const match of normalized.matchAll(/\b(\d{1,3})\s*(?:inch|inches|in\b|\")/g)) {
    const length = Number(match[1]);
    if (Number.isInteger(length) && length > 0 && length < 100) lengths.add(length);
  }
  return [...lengths];
}

export function productLength(product: AskZaraProductLike) {
  const titleMatch = product.title.match(/\b(\d{1,3})\s*(?:-\s*)?(?:inch|inches)\b/i);
  return titleMatch ? Number(titleMatch[1]) : undefined;
}

function matchesAny(normalized: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(normalized));
}

export function detectAskZaraIntents(value: string) {
  const m = normalizeAskZaraText(value);
  const intents = new Set<AskZaraIntent>();

  if (matchesAny(m, [/\b(product|products|wig|wigs|ponytail|ponytails|attachment|attachments|lace)\b/, /\bhow much\b/, /\bprice(?:s|d)?\b/, /\bcost\b/, /\b\d{1,3}\s*(?:inch|inches)\b/])) intents.add("products");
  if (matchesAny(m, [/\border\b/, /\bbuy\b/, /\bpurchase\b/, /\bplace\s+(?:an?\s+)?order\b/, /\bplace\b.{0,16}\b(?:order|other)\b/, /\bhow\s+(?:do|can)\s+i\s+(?:order|buy)\b/])) intents.add("order");
  if (matchesAny(m, [/\bwaybills?\b/, /\bdeliver(?:y|ed|ies)?\b/, /\bshipping?\b/, /\bship\b/])) intents.add("delivery");
  if (matchesAny(m, [/\bappointment\b/, /\bbook(?:ing|ed)?\b/, /\bslot\b/, /\bpreferred date\b/])) intents.add("appointment");
  if (matchesAny(m, [/\bwhere\s+are\s+you\b/, /\blocat(?:e|ed|ion)\b/, /\baddress\b/, /\bmeeting point\b/])) intents.add("location");
  if (matchesAny(m, [/\bopen(?:ing)?\b/, /\bclosing\b/, /\bhours?\b/, /\bwhat time\b/])) intents.add("hours");
  if (matchesAny(m, [/\bservice(?:s)?\b/, /\bhair styling\b/, /\bnail styling\b/, /\bbraids?\b/])) intents.add("services");
  if (matchesAny(m, [/\bgallery\b/, /\blook(?:s)?\b/, /\bstyle(?:s)?\b/, /\binspiration\b/])) intents.add("gallery");
  if (matchesAny(m, [/\bfaq\b/, /\bfaqs\b/, /\bfrequent(?:ly)? asked\b/, /\bcommon questions?\b/])) intents.add("faq");
  if (matchesAny(m, [/\bcontact\b/, /\bwhatsapp\b/, /\bphone\b/, /\bnumber\b/, /\breach\b/, /\bmessage\b/])) intents.add("contact");

  return intents;
}

export function isMultiTopicAskZaraQuestion(value: string) {
  const intents = detectAskZaraIntents(value);
  // Products + ordering is usually one shopping intent; services + appointment is
  // usually one booking intent. Other combinations should be answered together by AI.
  if (intents.has("products") && intents.has("order")) intents.delete("order");
  if (intents.has("services") && intents.has("appointment")) intents.delete("services");
  if (intents.has("contact") && (intents.has("order") || intents.has("appointment") || intents.has("delivery"))) intents.delete("contact");
  return intents.size > 1;
}

export type ProductMatch = {
  product: AskZaraProductLike;
  score: number;
  explicitLength: boolean;
};

export function rankProductsForQuestion(value: string, products: AskZaraProductLike[]) {
  const queryTokens = new Set(meaningfulAskZaraTokens(value));
  const lengths = extractProductLengths(value);
  const explicitLength = lengths.length > 0;

  return products
    .map((product): ProductMatch => {
      const length = productLength(product);
      let score = 0;
      if (explicitLength) {
        if (length && lengths.includes(length)) score += 100;
        else score -= 100;
      }

      const titleTokens = meaningfulAskZaraTokens(product.title);
      const overlap = titleTokens.filter((token) => queryTokens.has(token));
      score += overlap.length * 8;

      const normalizedTitle = normalizeAskZaraText(product.title);
      const normalizedQuery = normalizeAskZaraText(value);
      if (normalizedQuery.includes(normalizedTitle)) score += 80;
      return { product, score, explicitLength };
    })
    .sort((a, b) => b.score - a.score);
}

export function selectConfidentProducts(value: string, products: AskZaraProductLike[]) {
  const ranked = rankProductsForQuestion(value, products);
  const lengths = extractProductLengths(value);
  if (lengths.length > 0) {
    const exact = ranked.filter((entry) => entry.score >= 100);
    return exact;
  }

  // Without a size/length, require at least two exact meaningful title tokens.
  // This prevents mistakes such as matching "lace" inside the word "place".
  return ranked.filter((entry) => entry.score >= 16 && entry.score === ranked[0]?.score);
}

export function faqOverlapScore(message: string, question: string) {
  const messageTokens = new Set(meaningfulAskZaraTokens(message));
  const questionTokens = meaningfulAskZaraTokens(question);
  if (!questionTokens.length) return 0;
  const overlap = questionTokens.filter((token) => messageTokens.has(token)).length;
  const coverage = overlap / questionTokens.length;
  return overlap * 10 + Math.round(coverage * 10);
}

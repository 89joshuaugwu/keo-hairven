import { productPriceLabel, type BrowseProduct } from "@/lib/products";
import { resolveProductReference, matchingProductsByTopic, isCatalogueQuestion, extractAllLengthsInches, extractLengthInches, extractBareLengthFollowup } from "@/lib/ask-zara-intent";
import { museCatalogueProducts } from "@/lib/muse-catalogue";
export type ChatProductCardData = {
    id: string;
    title: string;
    priceLabel: string;
    href: string;
    image?: {
        src: string;
        alt: string;
    };
};
export function selectChatCards(message: string, history: {
    role: "user" | "assistant";
    text: string;
}[], products: BrowseProduct[]): ChatProductCardData[] {
    const lengths = extractAllLengthsInches(message);
    const bareLength = extractBareLengthFollowup(message);
    if (!lengths.length && bareLength !== null && history.some(turn => turn.role === "user" && (isCatalogueQuestion(turn.text) || extractAllLengthsInches(turn.text).length > 0))) lengths.push(bareLength);
    const live = museCatalogueProducts(products).filter(p => p.status === "published" && !p.designPreview && (!lengths.length || lengths.includes(extractLengthInches(p.title) || 0)));
    const reference = resolveProductReference(live, message, history);
    const relevant = reference ? [reference] : matchingProductsByTopic(live, message);
    const selected = relevant.length ? relevant : isCatalogueQuestion(message) ? live : [];
    return selected.slice(0, 3).map(p => ({ id: p.id, title: p.title, priceLabel: productPriceLabel(p), href: `/products/${p.slug}`, ...(p.media[0] ? { image: { src: p.media[0].src, alt: p.media[0].alt || p.title } } : {}) }));
}

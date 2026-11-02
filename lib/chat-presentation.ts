import { productPriceLabel, type BrowseProduct } from "@/lib/products";
import { resolveProductReference, matchingProductsByTopic, isCatalogueQuestion } from "@/lib/ask-zara-intent";
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
    const live = products.filter(p => p.status === "published" && !p.designPreview);
    const reference = resolveProductReference(live, message, history);
    const relevant = reference ? [reference] : matchingProductsByTopic(live, message);
    const selected = relevant.length ? relevant : isCatalogueQuestion(message) ? live : [];
    return selected.slice(0, 3).map(p => ({ id: p.id, title: p.title, priceLabel: productPriceLabel(p), href: `/products/${p.slug}`, ...(p.media[0] ? { image: { src: p.media[0].src, alt: p.media[0].alt || p.title } } : {}) }));
}

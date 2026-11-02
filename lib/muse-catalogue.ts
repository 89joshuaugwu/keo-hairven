import type { BrowseProduct } from "@/lib/products";
import { extractLengthInches } from "@/lib/ask-zara-intent";

/** Only published public projections enter Muse; each exact option retains its price and URL. */
export function museCatalogueProducts(products: BrowseProduct[]): BrowseProduct[] {
  return products.filter(product => product.status === "published" && !product.designPreview).flatMap(product => {
    if (!product.variants?.length) return [product];
    return product.variants.slice(0, 30).map(variant => ({
      ...product,
      id: `${product.id}:${variant.id}`,
      slug: variant.slug || product.slug,
      title: `${variant.title || `${product.title} — ${variant.label}`}${variant.lengthInches && extractLengthInches(variant.title) !== variant.lengthInches ? ` · ${variant.lengthInches} inches` : ""}`,
      priceMode: variant.priceMode,
      priceMinor: variant.priceMinor,
      minPriceMinor: variant.minPriceMinor,
      maxPriceMinor: variant.maxPriceMinor,
      hairColour: variant.colour || product.hairColour,
      variants: undefined,
    }));
  });
}

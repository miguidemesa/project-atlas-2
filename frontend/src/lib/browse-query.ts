import type { ListingQuery } from "./api";
import { LANGUAGE_OPTIONS } from "@atlas/api";
import type { CategoryInfo, ListingType } from "@atlas/api";

const SORTS = ["newest", "popular", "price_asc", "price_desc", "ending"] as const;
const MAX_CARD_KEY = 300;
const TYPES: ListingType[] = ["single_card", "lot", "hobby_box", "accessory"];

export type BrowseParams = Partial<
  Record<"category" | "format" | "type" | "graded" | "minPrice" | "maxPrice" | "language" | "sort" | "q" | "player" | "card", string>
>;

/** URL search params → a feed query. Unknown categories and junk values are dropped, never sent to the API. */
export function browseQuery(sp: BrowseParams, categories: CategoryInfo[]): ListingQuery {
  const amount = (v?: string) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined);
  return {
    category: categories.some((c) => c.slug === sp.category) ? sp.category : undefined,
    format: sp.format === "fixed" || sp.format === "auction" ? sp.format : undefined,
    type: TYPES.includes(sp.type as ListingType) ? (sp.type as ListingType) : undefined,
    graded: sp.graded === "true" || undefined,
    minPrice: amount(sp.minPrice),
    maxPrice: amount(sp.maxPrice),
    language: LANGUAGE_OPTIONS.some(([code]) => code === sp.language) ? sp.language : undefined,
    sort: (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as ListingQuery["sort"]) : "newest",
    q: sp.q?.trim() || undefined,
    player: sp.player || undefined,
    card: sp.card?.trim() && sp.card.length <= MAX_CARD_KEY ? sp.card : undefined,
  };
}

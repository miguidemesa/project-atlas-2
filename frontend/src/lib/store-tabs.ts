import type { Listing, Storefront, TopSeller } from "@atlas/api";

export type StoreTab =
  | { id: "trending" | "ending"; label: string; listings: Listing[] }
  | { id: "sellers"; label: string; sellers: TopSeller[] };

const ROWS = 8;

/** The home's store tabs, in order, without the ones that have no real data. Under market joins in P3. */
export function storeTabs(store: Pick<Storefront, "trending" | "newArrivals" | "topSellers" | "endingSoon">): StoreTab[] {
  const trending = store.trending.length > 0 ? store.trending : store.newArrivals;
  const tabs: StoreTab[] = [
    { id: "trending", label: "New and trending", listings: trending.slice(0, ROWS) },
    { id: "sellers", label: "Top sellers", sellers: store.topSellers.slice(0, ROWS) },
    { id: "ending", label: "Ending soon", listings: store.endingSoon.slice(0, ROWS) },
  ];
  return tabs.filter((t) => ("listings" in t ? t.listings.length : t.sellers.length) > 0);
}

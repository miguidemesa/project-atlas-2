import type { Listing, Storefront } from "@atlas/api";

export interface StoreTab {
  id: "trending" | "ending";
  label: string;
  listings: Listing[];
}

const ROWS = 8;

/** The home's store tabs, in order, without the ones that have no real data. Under market joins in P3; sellers are shop showcases. */
export function storeTabs(store: Pick<Storefront, "trending" | "newArrivals" | "endingSoon">): StoreTab[] {
  const trending = store.trending.length > 0 ? store.trending : store.newArrivals;
  const tabs: StoreTab[] = [
    { id: "trending", label: "New and trending", listings: trending.slice(0, ROWS) },
    { id: "ending", label: "Ending soon", listings: store.endingSoon.slice(0, ROWS) },
  ];
  return tabs.filter((t) => t.listings.length > 0);
}

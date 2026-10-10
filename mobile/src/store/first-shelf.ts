import type { Listing, Storefront } from "@atlas/api";

const SHELVES = [
  ["spotlight", "Spotlight"],
  ["trending", "Trending"],
  ["grails", "Grails"],
  ["endingSoon", "Ending soon"],
  ["newArrivals", "New arrivals"],
] as const;

/** The storefront's first shelf that has listings. M1 shows only this; P2 builds the full store home. */
export function firstShelf(storefront: Storefront): { title: string; listings: Listing[] } | null {
  for (const [key, title] of SHELVES) {
    const listings = storefront[key];
    if (listings.length > 0) return { title, listings };
  }
  return null;
}

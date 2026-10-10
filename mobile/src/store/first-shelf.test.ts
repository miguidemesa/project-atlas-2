import type { Listing, Storefront } from "@atlas/api";
import { firstShelf } from "./first-shelf";

const empty = {
  category: null,
  activeListings: 0,
  categories: [],
  spotlight: [],
  trending: [],
  grails: [],
  endingSoon: [],
  newArrivals: [],
  recentlySold: [],
  sets: [],
  topSellers: [],
  generatedAt: "2026-10-05T00:00:00Z",
} as Storefront;
const listing = (id: string) => ({ id }) as Listing;

it("takes the first shelf in store order", () => {
  expect(firstShelf({ ...empty, spotlight: [listing("a")], trending: [listing("b")] })).toEqual({ title: "Spotlight", listings: [listing("a")] });
});

it("skips empty shelves", () => {
  expect(firstShelf({ ...empty, endingSoon: [listing("c")] })?.title).toBe("Ending soon");
});

it("returns null when every shelf is empty, so the screen says so instead of inventing listings", () => {
  expect(firstShelf(empty)).toBeNull();
});

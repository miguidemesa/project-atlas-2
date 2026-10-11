import { describe, expect, it } from "vitest";
import { storeTabs } from "./store-tabs";
import type { Listing, TopSeller } from "@atlas/api";

const listing = (id: string) => ({ id }) as Listing;
const seller = (id: string) => ({ id, displayName: id, sales: 1, verified: false, ratingAvg: null, ratingCount: 0, liveListings: 0, listings: [] }) as TopSeller;
const empty = { trending: [], newArrivals: [], topSellers: [], endingSoon: [] };

describe("storeTabs", () => {
  it("hides tabs with nothing to show", () => {
    expect(storeTabs(empty)).toEqual([]);
    expect(storeTabs({ ...empty, topSellers: [seller("s")] }).map((t) => t.id)).toEqual(["sellers"]);
  });

  it("falls back to new arrivals when nothing has trended yet", () => {
    const [tab] = storeTabs({ ...empty, newArrivals: [listing("n")] });
    expect(tab).toMatchObject({ id: "trending", label: "New and trending", listings: [{ id: "n" }] });
  });

  it("shows at most eight rows a tab, in the store order", () => {
    const many = Array.from({ length: 12 }, (_, i) => listing(String(i)));
    const tabs = storeTabs({ trending: many, newArrivals: [], topSellers: [seller("s")], endingSoon: many });
    expect(tabs.map((t) => t.id)).toEqual(["trending", "sellers", "ending"]);
    expect("listings" in tabs[0] && tabs[0].listings).toHaveLength(8);
  });
});

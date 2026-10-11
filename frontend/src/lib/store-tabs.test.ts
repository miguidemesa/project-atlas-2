import { describe, expect, it } from "vitest";
import { storeTabs } from "./store-tabs";
import type { Listing } from "@atlas/api";

const listing = (id: string) => ({ id }) as Listing;
const empty = { trending: [], newArrivals: [], endingSoon: [] };

describe("storeTabs", () => {
  it("hides tabs with nothing to show", () => {
    expect(storeTabs(empty)).toEqual([]);
    expect(storeTabs({ ...empty, endingSoon: [listing("e")] }).map((t) => t.id)).toEqual(["ending"]);
  });

  it("falls back to new arrivals when nothing has trended yet", () => {
    const [tab] = storeTabs({ ...empty, newArrivals: [listing("n")] });
    expect(tab).toMatchObject({ id: "trending", label: "New and trending", listings: [{ id: "n" }] });
  });

  it("shows at most eight rows a tab, in the store order; sellers moved to the shop showcases", () => {
    const many = Array.from({ length: 12 }, (_, i) => listing(String(i)));
    const tabs = storeTabs({ trending: many, newArrivals: [], endingSoon: many });
    expect(tabs.map((t) => t.id)).toEqual(["trending", "ending"]);
    expect(tabs[0].listings).toHaveLength(8);
  });
});

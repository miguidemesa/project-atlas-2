import { describe, expect, it } from "vitest";
import { busiest, categoryName, groupCategories } from "./categories";
import type { CategoryInfo } from "./types";

const category = (slug: string, activeListings: number): CategoryInfo => ({
  slug,
  name: slug.toUpperCase(),
  group: "tcg",
  hue: 200,
  activeListings,
});

describe("category helpers", () => {
  it("lists only categories with listings, busiest first", () => {
    expect(busiest([category("a", 0), category("b", 5), category("c", 9)], 8).map((c) => c.slug)).toEqual(["c", "b"]);
  });

  it("names a slug, or undefined when the slug is unknown", () => {
    expect(categoryName([category("pokemon", 1)], "pokemon")).toBe("POKEMON");
    expect(categoryName([category("pokemon", 1)], "nba")).toBeUndefined();
  });
});

describe("groupCategories", () => {
  const c = (slug: string, group: CategoryInfo["group"], activeListings: number, name = slug): CategoryInfo =>
    ({ slug, name, group, hue: 0, activeListings });

  it("groups tcg, sports, non-sport; busiest first then by name; drops empty groups", () => {
    const groups = groupCategories([c("b", "sports", 1), c("z", "tcg", 0, "Zeta"), c("a", "tcg", 0, "Alpha"), c("p", "tcg", 9)]);
    expect(groups.map((g) => g.group)).toEqual(["tcg", "sports"]);
    expect(groups[0].categories.map((x) => x.slug)).toEqual(["p", "a", "z"]);
    expect(groups[0].label).toBe("Trading card games");
  });
});

import { describe, expect, it } from "vitest";
import { browseQuery } from "./browse-query";
import type { CategoryInfo } from "./types";

const categories: CategoryInfo[] = [{ slug: "pokemon", name: "Pokémon", group: "tcg", hue: 95, activeListings: 3 }];

describe("browseQuery", () => {
  it("keeps known categories and drops legacy or unknown ones", () => {
    expect(browseQuery({ category: "pokemon" }, categories).category).toBe("pokemon");
    expect(browseQuery({ category: "nba" }, categories).category).toBeUndefined();
  });

  it("ignores junk numbers and unknown sorts", () => {
    expect(browseQuery({ minPrice: "abc", maxPrice: "5000", sort: "random" }, categories)).toMatchObject({
      minPrice: undefined,
      maxPrice: 5000,
      sort: "newest",
    });
  });

  it("reads the graded, format and type flags", () => {
    expect(browseQuery({ graded: "true", format: "auction", type: "hobby_box" }, categories)).toMatchObject({
      graded: true,
      format: "auction",
      type: "hobby_box",
    });
  });

  it("drops unknown types and formats", () => {
    expect(browseQuery({ type: "bogus", format: "x" }, categories)).toMatchObject({ type: undefined, format: undefined });
  });
});

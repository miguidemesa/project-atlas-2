import { describe, expect, it } from "vitest";
import { busiest, categoryName, skinFor, skinVars } from "./categories";
import type { CategoryInfo } from "./types";

const category = (slug: string, activeListings: number): CategoryInfo => ({
  slug,
  name: slug.toUpperCase(),
  group: "tcg",
  hue: 200,
  activeListings,
});

describe("skins", () => {
  it("uses the hand-tuned Pokémon skin from the mockups", () => {
    expect(skinFor("pokemon", 95).accent).toBe("#f5cd47");
  });

  it("derives every other game's skin from its hue", () => {
    const skin = skinFor("gundam", 210);
    expect(skin.ground).toBe("oklch(0.17 0.03 210)");
    expect(skin.accent).toBe("oklch(0.84 0.12 210)");
  });

  it("exposes a skin as CSS variables", () => {
    expect(skinVars(skinFor("gundam", 210))).toMatchObject({ "--skin-accent": "oklch(0.84 0.12 210)" });
  });
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

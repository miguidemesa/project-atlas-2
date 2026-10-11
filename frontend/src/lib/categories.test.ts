import { describe, expect, it } from "vitest";
import { toNativeColor } from "@atlas/tokens";
import { busiest, categoryName, gameColor, groupCategories, skinFor, skinVars } from "./categories";
import type { CategoryInfo } from "@atlas/api";

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
    expect(skin.ground).toBe(toNativeColor("oklch(0.17 0.03 210)"));
    expect(skin.accent).toBe(toNativeColor("oklch(0.84 0.12 210)"));
  });

  it("exposes a skin as CSS variables", () => {
    expect(skinVars(skinFor("gundam", 210))).toMatchObject({ "--skin-accent": toNativeColor("oklch(0.84 0.12 210)") });
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

describe("eleven skin roles", () => {
  it("sets all eleven skin roles", () => {
    expect(Object.keys(skinVars(skinFor("pokemon", 95))).sort()).toEqual([
      "--skin-accent", "--skin-border", "--skin-control", "--skin-faint", "--skin-ground", "--skin-line",
      "--skin-line-strong", "--skin-on-accent", "--skin-raised", "--skin-surface", "--skin-text",
    ]);
  });

  it("derives an untuned game's skin from its hue", () => {
    const s = skinFor("gundam", 210);
    expect(s.ground).toBe(toNativeColor("oklch(0.17 0.03 210)"));
    expect(s.onAccent).toBe(toNativeColor("oklch(0.2 0.04 210)"));
    expect(s.lineStrong).toBe(toNativeColor("oklch(0.82 0.03 210 / 0.28)"));
  });

  it("uses the tuned One Piece red and Basketball blue for the colour line", () => {
    expect(gameColor("one_piece", 25)).toBe("#ff7a66");
    expect(gameColor("basketball", 45)).toBe("#8fb3f5");
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

import { describe, expect, it } from "vitest";
import { hubFeedQuery, hubGame, hubHref, hubTab } from "./hub";

const categories = [{ slug: "pokemon", name: "Pokémon", group: "tcg" as const, hue: 95, activeListings: 7 }];

describe("hub routing", () => {
  it("only an exact slug opens a hub", () => {
    expect(hubGame(categories, "pokemon")?.name).toBe("Pokémon");
    expect(hubGame(categories, "POKEMON")).toBeUndefined();
    expect(hubGame(categories, "nba")).toBeUndefined();
  });

  it("reads the tab, defaulting to the overview", () => {
    expect(hubTab("graded")).toBe("graded");
    expect(hubTab(undefined)).toBe("overview");
    expect(hubTab("bogus")).toBe("overview");
  });

  it("scopes each listing tab's feed to the game", () => {
    expect(hubFeedQuery("pokemon", "singles")).toEqual({ category: "pokemon", type: "single_card", pageSize: 24 });
    expect(hubFeedQuery("pokemon", "graded")).toEqual({ category: "pokemon", graded: true, pageSize: 24 });
    expect(hubFeedQuery("pokemon", "sealed")).toEqual({ category: "pokemon", type: "hobby_box", pageSize: 24 });
    expect(hubFeedQuery("pokemon", "overview", "ja")).toEqual({ category: "pokemon", language: "ja", pageSize: 12 });
    expect(hubFeedQuery("pokemon", "sets")).toBeNull();
  });

  it("builds tab links without empty parameters", () => {
    expect(hubHref("pokemon", "overview")).toBe("/c/pokemon");
    expect(hubHref("pokemon", "graded")).toBe("/c/pokemon?tab=graded");
    expect(hubHref("pokemon", "overview", "ja")).toBe("/c/pokemon?lang=ja");
  });
});

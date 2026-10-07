import { describe, expect, it } from "vitest";
import { BUDGETS, gamesMenuSections, isStorePage, STORE_LINKS } from "./store-nav";

describe("isStorePage", () => {
  it.each(["/", "/browse", "/categories", "/c/pokemon", "/listing/abc", "/sellers/xyz"])("%s is a store page", (p) => {
    expect(isStorePage(p)).toBe(true);
  });

  it.each(["/sell", "/orders", "/login", "/register", "/admin", "/messages", "/browsefoo", "/c", "/condition-guide"])(
    "%s shows the global bar alone",
    (p) => expect(isStorePage(p)).toBe(false),
  );
});

describe("STORE_LINKS", () => {
  it("leaves Under market out until P3 has median prices", () => {
    expect(STORE_LINKS.map((l) => l.label)).toEqual(["Browse all", "New and trending", "Ending soon", "Graded slabs", "Sealed"]);
  });
});

describe("gamesMenuSections", () => {
  const categories = [
    { slug: "pokemon", name: "Pokémon", group: "tcg" as const, hue: 95, activeListings: 7 },
    { slug: "basketball", name: "Basketball", group: "sports" as const, hue: 45, activeListings: 14 },
    { slug: "kayou", name: "Kayou", group: "nonsport" as const, hue: 40, activeListings: 0 },
  ];

  it("lists every game under its group, linking to its hub, with counts only when there are listings", () => {
    const sections = gamesMenuSections(categories);
    expect(sections.map((s) => s.label)).toEqual(["Trading card games", "Sports", "Non-sport"]);
    expect(sections[0].items).toEqual([{ slug: "pokemon", href: "/c/pokemon", count: 7 }]);
    expect(sections[2].items).toEqual([{ slug: "kayou", href: "/c/kayou", count: null }]);
  });

  it("is empty when the API is down, so the menu shows only All games", () => {
    expect(gamesMenuSections([])).toEqual([]);
  });
});

describe("BUDGETS", () => {
  it("are contiguous peso brackets that open filtered browse pages", () => {
    expect(BUDGETS.map((b) => b.label)).toEqual(["Under ₱1,000", "₱1,000–5,000", "₱5,000–20,000", "₱20,000 and up"]);
    expect(BUDGETS.map((b) => b.href)).toEqual([
      "/browse?maxPrice=999.99",
      "/browse?minPrice=1000&maxPrice=4999.99",
      "/browse?minPrice=5000&maxPrice=19999.99",
      "/browse?minPrice=20000",
    ]);
  });
});

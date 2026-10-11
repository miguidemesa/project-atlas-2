import { describe, expect, it } from "vitest";
import type { CategoryInfo } from "@atlas/api";
import { homeGames } from "./home-order";

const cat = (slug: string, activeListings: number): CategoryInfo => ({ slug, name: slug, group: "tcg", hue: 0, activeListings });
const categories = [cat("pokemon", 40), cat("basketball", 30), cat("one_piece", 20), cat("lorcana", 10), cat("riftbound", 0)];

describe("homeGames", () => {
  it("orders the home by the visitor's games, then the busiest others", () => {
    const { personalized, own, order } = homeGames(categories, "lorcana,one_piece");
    expect(personalized).toBe(true);
    expect(own).toBe(2);
    expect(order.map((c) => c.slug)).toEqual(["lorcana", "one_piece", "pokemon", "basketball"]);
  });

  it("falls back to the busiest games for a first visit or a junk cookie, never a game with no listings", () => {
    for (const raw of [undefined, "", "nba,<script>,%%%"]) {
      const { personalized, order } = homeGames(categories, raw);
      expect(personalized).toBe(false);
      expect(order.map((c) => c.slug)).toEqual(["pokemon", "basketball", "one_piece", "lorcana"]);
    }
  });

  it("counts only the visitor's own games, so a filled-in busiest game isn't called theirs", () => {
    const { own, order } = homeGames(categories, "lorcana");
    expect(own).toBe(1);
    expect(order[1].slug).toBe("pokemon");
  });

  it("keeps a followed game even when it has no listings right now", () => {
    expect(homeGames(categories, "riftbound").order[0].slug).toBe("riftbound");
  });
});

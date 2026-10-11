import { describe, expect, it } from "vitest";
import { isGameSlug, pickGames, scoreInterest, topGames } from "./interest";

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 11);

describe("scoreInterest", () => {
  it("weights watches over views, halves every ten days, and sums to one", () => {
    const scores = scoreInterest(
      [
        { category: "pokemon", kind: "view", at: now },
        { category: "one_piece", kind: "watch", at: now },
        { category: "lorcana", kind: "view", at: now - 10 * DAY },
      ],
      now,
    );
    expect(scores.one_piece).toBeGreaterThan(scores.pokemon);
    expect(scores.lorcana).toBeCloseTo(scores.pokemon / 2, 5);
    expect(Object.values(scores).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("is empty for a cold visitor, and skips events that aren't games", () => {
    expect(scoreInterest([], now)).toEqual({});
    expect(scoreInterest([{ category: "<script>", kind: "view", at: now }], now)).toEqual({});
  });
});

describe("topGames", () => {
  it("returns the visitor's strongest games, highest first", () => {
    expect(topGames({ pokemon: 5, basketball: 9, magic: 0, lorcana: 2 })).toEqual(["basketball", "pokemon", "lorcana"]);
  });
});

describe("pickGames", () => {
  const known = ["pokemon", "basketball", "one_piece", "lorcana"];
  it("keeps known slugs only, at most three, no repeats", () => {
    expect(pickGames(["pokemon", "nba", "<script>", "pokemon", "lorcana", "basketball", "one_piece"], known)).toEqual(["pokemon", "lorcana", "basketball"]);
  });
  it("is empty for nothing or junk", () => {
    expect(pickGames([], known)).toEqual([]);
    expect(pickGames(["%%%"], known)).toEqual([]);
  });
});

describe("isGameSlug", () => {
  it("accepts slugs and refuses anything that could break a cookie", () => {
    expect(isGameSlug("one_piece")).toBe(true);
    expect(isGameSlug("x; Domain=evil")).toBe(false);
  });
});

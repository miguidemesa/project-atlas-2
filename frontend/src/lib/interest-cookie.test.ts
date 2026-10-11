import { describe, expect, it } from "vitest";
import { readInterest, topGames } from "./interest-cookie";

describe("topGames", () => {
  it("returns the visitor's strongest games, highest first", () => {
    expect(topGames({ pokemon: 5, basketball: 9, magic: 0, lorcana: 2 })).toEqual(["basketball", "pokemon", "lorcana"]);
  });
});

describe("readInterest", () => {
  const known = ["pokemon", "basketball", "one_piece", "lorcana"];
  it("keeps known slugs only, at most three, no repeats", () => {
    expect(readInterest("pokemon,nba,<script>,pokemon,lorcana,basketball,one_piece", known)).toEqual(["pokemon", "lorcana", "basketball"]);
  });
  it("is empty for a missing or junk cookie", () => {
    expect(readInterest(undefined, known)).toEqual([]);
    expect(readInterest("%%%", known)).toEqual([]);
  });
});

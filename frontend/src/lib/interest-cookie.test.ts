import { describe, expect, it } from "vitest";
import { readInterest } from "./interest-cookie";

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

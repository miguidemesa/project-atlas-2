import { describe, expect, it, beforeEach } from "vitest";
import { getAffinity, recordAffinityEvent, topCategory, personalRelevance } from "./affinity";

const DAY = 86_400_000;

describe("affinity engine", () => {
  beforeEach(() => window.localStorage.clear());

  it("returns all-zero scores for a cold visitor", () => {
    const scores = getAffinity();
    expect(Object.values(scores).every((v) => v === 0)).toBe(true);
    expect(topCategory(scores)).toBeNull();
  });

  it("weights watch events above plain views", () => {
    recordAffinityEvent("pokemon", "view", Date.now());
    recordAffinityEvent("nba", "watch", Date.now());
    const scores = getAffinity();
    expect(scores.nba).toBeGreaterThan(scores.pokemon);
  });

  it("decays old activity with a half-life", () => {
    const now = Date.now();
    recordAffinityEvent("pokemon", "view", now - DAY); // fresh
    recordAffinityEvent("nba", "view", now - 40 * DAY); // stale
    const scores = getAffinity(now);
    expect(scores.pokemon).toBeGreaterThan(scores.nba);
  });

  it("declares a top category once interest passes one third of activity", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordAffinityEvent("one_piece", "view", now);
    recordAffinityEvent("disney", "view", now);
    const { category, share } = topCategory(getAffinity(now))!;
    expect(category).toBe("one_piece");
    expect(share).toBeGreaterThan(0.75);
  });

  it("normalizes scores to sum to one", () => {
    recordAffinityEvent("nba", "search", Date.now());
    recordAffinityEvent("disney", "browse", Date.now());
    const scores = getAffinity();
    expect(Object.values(scores).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("blends affinity and freshness in personal relevance", () => {
    const now = Date.now();
    const scores = { nba: 0.8, pokemon: 0.1, one_piece: 0.05, disney: 0.05 };
    const oldPokemon = personalRelevance({ category: "pokemon", createdAt: new Date(now - 20 * DAY).toISOString() }, scores, now);
    const freshNba = personalRelevance({ category: "nba", createdAt: new Date(now - DAY).toISOString() }, scores, now);
    expect(freshNba).toBeGreaterThan(oldPokemon);
    expect(oldPokemon).toBeGreaterThan(0); // affinity still contributes
  });
});

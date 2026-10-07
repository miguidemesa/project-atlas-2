import { beforeEach, describe, expect, it } from "vitest";
import { getAffinity, personalRelevance, recordAffinityEvent, topCategory } from "./affinity";

const DAY = 86_400_000;

describe("affinity engine", () => {
  beforeEach(() => window.localStorage.clear());

  it("has no scores for a cold visitor", () => {
    expect(getAffinity()).toEqual({});
    expect(topCategory(getAffinity())).toBeNull();
  });

  it("weights watch events above plain views", () => {
    recordAffinityEvent("pokemon", "view", Date.now());
    recordAffinityEvent("basketball", "watch", Date.now());
    const scores = getAffinity();
    expect(scores.basketball).toBeGreaterThan(scores.pokemon);
  });

  it("decays old activity with a half-life", () => {
    const now = Date.now();
    recordAffinityEvent("pokemon", "view", now - DAY);
    recordAffinityEvent("basketball", "view", now - 40 * DAY);
    const scores = getAffinity(now);
    expect(scores.pokemon).toBeGreaterThan(scores.basketball);
  });

  it("declares a top category once interest passes one third of activity", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordAffinityEvent("one_piece", "view", now);
    recordAffinityEvent("lorcana", "view", now);
    const { category, share } = topCategory(getAffinity(now))!;
    expect(category).toBe("one_piece");
    expect(share).toBeGreaterThan(0.75);
  });

  it("normalizes scores to sum to one", () => {
    recordAffinityEvent("basketball", "search", Date.now());
    recordAffinityEvent("magic", "browse", Date.now());
    expect(Object.values(getAffinity()).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("still counts events stored under the old nba and disney slugs", () => {
    window.localStorage.setItem("atlas-affinity.v1", JSON.stringify([{ category: "nba", kind: "view", at: Date.now() }]));
    expect(topCategory(getAffinity())!.category).toBe("basketball");
  });

  it("ignores anything that isn't a category slug", () => {
    recordAffinityEvent("<script>", "view");
    expect(getAffinity()).toEqual({});
  });

  it("blends affinity and freshness in personal relevance", () => {
    const now = Date.now();
    const scores = { basketball: 0.8, pokemon: 0.2 };
    const oldPokemon = personalRelevance({ category: "pokemon", createdAt: new Date(now - 20 * DAY).toISOString() }, scores, now);
    const freshBasketball = personalRelevance({ category: "basketball", createdAt: new Date(now - DAY).toISOString() }, scores, now);
    expect(freshBasketball).toBeGreaterThan(oldPokemon);
    expect(oldPokemon).toBeGreaterThan(0);
  });
});

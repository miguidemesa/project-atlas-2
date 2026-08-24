import { describe, expect, it } from "vitest";
import { computeDealScore } from "./deal-score";
import type { PricePoint } from "./types";

const hist = (prices: number[]): PricePoint[] => prices.map((p, i) => ({ date: `2026-08-${String(i + 1).padStart(2, "0")}`, price: p }));

describe("computeDealScore", () => {
  it("labels great deals below 8% under median", () => {
    const r = computeDealScore(8800, hist([10000, 9800, 10200, 10100, 9900]))!;
    expect(r.rating).toBe("great");
    expect(r.deltaPct).toBe(-12);
    expect(r.samples).toBe(5);
  });

  it("labels fair within the band and above past +8%", () => {
    expect(computeDealScore(10400, hist([10000, 9800, 10200, 10100, 9900]))!.rating).toBe("fair");
    expect(computeDealScore(10800, hist([10000, 9800, 10200, 10100, 9900]))!.rating).toBe("fair");
    expect(computeDealScore(11500, hist([10000, 9800, 10200, 10100, 9900]))!.rating).toBe("above");
  });

  it("returns undefined with fewer than three samples", () => {
    expect(computeDealScore(10000, hist([9500, 10500]))).toBeUndefined();
  });
});

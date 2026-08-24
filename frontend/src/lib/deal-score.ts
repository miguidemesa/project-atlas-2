import type { DealScore, PricePoint } from "./types";

/**
 * Frontend mirror of Atlas.Application/Pricing/DealScoreService so mockups
 * score identically today; swap for the API field once listings endpoints
 * ship (the backend owns this computation long-term).
 */
const MIN_SAMPLES = 3;

export function computeDealScore(askPhp: number, history: PricePoint[]): DealScore | undefined {
  const prices = history.map((p) => p.price);
  if (prices.length < MIN_SAMPLES || askPhp <= 0) return undefined;

  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  if (median <= 0) return undefined;

  const deltaPct = Math.round(((askPhp - median) / median) * 1000) / 10;
  const rating = askPhp <= median * 0.92 ? "great" : askPhp <= median * 1.08 ? "fair" : "above";
  return { rating, medianPhp: Math.round(median), deltaPct, samples: sorted.length };
}

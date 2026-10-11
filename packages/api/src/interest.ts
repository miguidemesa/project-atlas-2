/** The anonymous interest profile both clients keep on the device: weighted events with a ten-day half-life. */
export type InterestKind = "view" | "watch" | "search" | "browse";

export interface InterestEvent {
  category: string;
  kind: InterestKind;
  at: number; // epoch ms
}

/** Category slug → share of recent interest; a missing slug means none. */
export type InterestScores = Record<string, number>;

export const MAX_GAMES = 3;
export const MAX_EVENTS = 200;
const WEIGHTS: Record<InterestKind, number> = { view: 1, watch: 1.6, search: 1.2, browse: 0.6 };
const HALF_LIFE_MS = 10 * 86_400_000;
const SLUG = /^[a-z0-9_]{2,40}$/;

export const isGameSlug = (s: string): boolean => SLUG.test(s);

/** Decayed, normalized scores in [0, 1]; empty for a cold visitor. */
export function scoreInterest(events: InterestEvent[], now = Date.now()): InterestScores {
  const scores: InterestScores = {};
  let total = 0;
  for (const e of events) {
    if (!isGameSlug(e.category) || !(e.kind in WEIGHTS)) continue;
    const weight = WEIGHTS[e.kind] * 0.5 ** (Math.max(0, now - e.at) / HALF_LIFE_MS);
    scores[e.category] = (scores[e.category] ?? 0) + weight;
    total += weight;
  }
  if (total > 0) for (const key of Object.keys(scores)) scores[key] /= total;
  return scores;
}

/** The visitor's strongest games, highest first, ties by slug. */
export function topGames(scores: InterestScores, n = MAX_GAMES): string[] {
  return Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, n)
    .map(([slug]) => slug);
}

/** Known slugs only, at most `max`, no repeats: a tampered cookie or stale storage can't add a game. */
export function pickGames(slugs: Iterable<string>, known: string[], max = MAX_GAMES): string[] {
  const out: string[] = [];
  for (const slug of slugs) {
    if (known.includes(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === max) break;
  }
  return out;
}

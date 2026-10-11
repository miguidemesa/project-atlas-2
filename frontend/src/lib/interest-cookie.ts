import type { AffinityScores } from "./affinity";

/** First-party cookie mirroring the device-local interest profile: up to three game slugs, nothing personal. */
export const INTEREST_COOKIE = "atlas_games";

const MAX_GAMES = 3;
const ONE_YEAR_SECONDS = 31_536_000;

export function topGames(scores: AffinityScores, n = MAX_GAMES): string[] {
  return Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, n)
    .map(([slug]) => slug);
}

/** The visitor's games from the cookie; unknown or junk slugs are dropped, so a tampered cookie can't break the page. */
export function readInterest(raw: string | undefined, known: string[]): string[] {
  const out: string[] = [];
  for (const slug of (raw ?? "").split(",")) {
    if (known.includes(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === MAX_GAMES) break;
  }
  return out;
}

export function writeInterestCookie(scores: AffinityScores): void {
  document.cookie = `${INTEREST_COOKIE}=${topGames(scores).join(",")}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

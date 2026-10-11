import type { CategoryInfo } from "@atlas/api";
import { busiest } from "./categories";
import { readInterest } from "./interest-cookie";

const HOME_GAMES = 8;

/**
 * The games the home is ordered by: the visitor's own (from the interest cookie) followed by the busiest others,
 * or only the busiest for a first visit. `own` counts the visitor's games at the front of `order`. A tampered
 * cookie can't add a game that doesn't exist.
 */
export function homeGames(
  categories: CategoryInfo[],
  rawCookie: string | undefined,
): { personalized: boolean; own: number; order: CategoryInfo[] } {
  const mine = readInterest(rawCookie, categories.map((c) => c.slug))
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is CategoryInfo => c !== undefined);
  const others = busiest(categories, HOME_GAMES).filter((c) => !mine.includes(c));
  return { personalized: mine.length > 0, own: mine.length, order: [...mine, ...others].slice(0, HOME_GAMES) };
}

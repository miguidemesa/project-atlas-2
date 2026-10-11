import { busiest } from "./categories";
import { pickGames } from "./interest";
import type { CategoryInfo } from "./types";

const HOME_GAMES = 8;

/**
 * The games the home is ordered by: the visitor's own followed by the busiest others, or only the busiest for a
 * first visit. `own` counts the visitor's games at the front of `order`.
 */
export function homeGames(
  categories: CategoryInfo[],
  wanted: Iterable<string>,
): { personalized: boolean; own: number; order: CategoryInfo[] } {
  const mine = pickGames(wanted, categories.map((c) => c.slug))
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is CategoryInfo => c !== undefined);
  const others = busiest(categories, HOME_GAMES).filter((c) => !mine.includes(c));
  return { personalized: mine.length > 0, own: mine.length, order: [...mine, ...others].slice(0, HOME_GAMES) };
}

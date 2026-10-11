import { isGameSlug, pickGames, topGames, type InterestScores } from "@atlas/api";

export { topGames } from "@atlas/api";

/** First-party cookie mirroring the device-local interest profile: up to three game slugs, nothing personal. */
export const INTEREST_COOKIE = "atlas_games";

const ONE_YEAR_SECONDS = 31_536_000;

/** The visitor's games from the cookie; unknown or junk slugs are dropped, so a tampered cookie can't break the page. */
export function readInterest(raw: string | undefined, known: string[]): string[] {
  return pickGames((raw ?? "").split(","), known);
}

/** Only slug-shaped names reach the cookie, so tampered local storage can't add cookie attributes. */
export function writeInterestCookie(scores: InterestScores): void {
  const games = topGames(scores).filter(isGameSlug);
  document.cookie = `${INTEREST_COOKIE}=${games.join(",")}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

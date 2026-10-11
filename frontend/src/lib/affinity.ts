/**
 * Anonymous interest profile kept in localStorage. Weighted events with
 * exponential time decay produce per-category affinity scores. When accounts
 * ship, the same event shape moves server-side so the profile follows the
 * user across devices — this module stays as the anonymous fallback.
 */

import { isGameSlug, MAX_EVENTS, scoreInterest, type InterestEvent, type InterestKind, type InterestScores } from "@atlas/api";
import { writeInterestCookie } from "./interest-cookie";

export type AffinityEventKind = InterestKind;
export type AffinityEvent = InterestEvent;
/** Category slug → share of recent interest. A missing slug means zero. */
export type AffinityScores = InterestScores;

const STORAGE_KEY = "atlas-affinity.v1";
/** Slugs renamed when every game joined the category list; events stored before that still count. */
const RENAMED: Record<string, string> = { nba: "basketball", disney: "lorcana" };

export function emptyScores(): AffinityScores {
  return {};
}

function loadEvents(): AffinityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AffinityEvent[]) : [];
    return Array.isArray(parsed)
      ? parsed.slice(-MAX_EVENTS).map((e) => ({ ...e, category: RENAMED[e.category] ?? e.category }))
      : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AffinityEvent[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // storage unavailable (private mode) — personalization silently off
  }
}

export function recordAffinityEvent(category: string, kind: AffinityEventKind, now = Date.now()) {
  if (!isGameSlug(category)) return;
  const events = loadEvents();
  events.push({ category, kind, at: now });
  saveEvents(events);
  try {
    writeInterestCookie(getAffinity(now)); // lets the server order the home by the visitor's games, with no flash
  } catch {
    // cookies blocked: the home falls back to the busiest games
  }
}

/** Decay-corrected, normalized scores in [0..1]; empty for a cold visitor (scoring shared with the app). */
export function getAffinity(now = Date.now()): AffinityScores {
  return scoreInterest(loadEvents(), now);
}

export function topCategory(scores: AffinityScores): { category: string; share: number } | null {
  let best: string | null = null;
  for (const key of Object.keys(scores)) if (!best || scores[key] > scores[best]) best = key;
  if (!best || scores[best] < 0.34) return null; // no clear interest yet
  return { category: best, share: scores[best] };
}

/** Score a listing by blending affinity with freshness. */
export function personalRelevance(
  listing: { category: string; createdAt: string },
  scores: AffinityScores,
  now = Date.now(),
): number {
  const affinity = scores[listing.category] ?? 0;
  const ageDays = Math.max(0, (now - +new Date(listing.createdAt)) / 86_400_000);
  const freshness = Math.pow(0.5, ageDays / 7); // 7-day half-life on newness
  return affinity * 100 + freshness * 12;
}

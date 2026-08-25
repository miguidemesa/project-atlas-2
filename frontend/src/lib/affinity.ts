import type { Category } from "./types";

/**
 * Anonymous interest profile kept in localStorage. Weighted events with
 * exponential time decay produce per-category affinity scores. When accounts
 * ship, the same event shape moves server-side (POST /api/events) so the
 * profile follows the user across devices — this module stays as the
 * anonymous fallback.
 */

export type AffinityEventKind = "view" | "watch" | "search" | "browse";

const KIND_WEIGHTS: Record<AffinityEventKind, number> = {
  view: 1,
  watch: 1.6,
  search: 1.2,
  browse: 0.6,
};

const HALF_LIFE_DAYS = 10;
const STORAGE_KEY = "atlas-affinity.v1";
const MAX_EVENTS = 200;

export interface AffinityEvent {
  category: Category;
  kind: AffinityEventKind;
  at: number; // epoch ms
}

export type AffinityScores = Record<Category, number>;

export function emptyScores(): AffinityScores {
  return { nba: 0, pokemon: 0, one_piece: 0, disney: 0 };
}

function loadEvents(): AffinityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AffinityEvent[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : [];
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

export function recordAffinityEvent(category: Category, kind: AffinityEventKind, now = Date.now()) {
  if (!["nba", "pokemon", "one_piece", "disney"].includes(category)) return;
  const events = loadEvents();
  events.push({ category, kind, at: now });
  saveEvents(events);
}

/** Decay-corrected, normalized scores in [0..1]; all zeros when cold. */
export function getAffinity(now = Date.now()): AffinityScores {
  const events = loadEvents();
  const scores = emptyScores();
  const halfLivesMs = HALF_LIFE_DAYS * 86_400_000;

  let total = 0;
  for (const e of events) {
    const age = Math.max(0, now - e.at);
    const decay = Math.pow(0.5, age / halfLivesMs);
    const weight = KIND_WEIGHTS[e.kind] * decay;
    scores[e.category] += weight;
    total += weight;
  }

  if (total > 0) {
    for (const key of Object.keys(scores) as Category[]) {
      scores[key] = scores[key] / total;
    }
  }
  return scores;
}

export function topCategory(scores: AffinityScores): { category: Category; share: number } | null {
  let best: Category | null = null;
  for (const key of Object.keys(scores) as Category[]) {
    if (!best || scores[key] > scores[best]) best = key;
  }
  if (!best || scores[best] < 0.34) return null; // no clear interest yet
  return { category: best, share: scores[best] };
}

/** Score a listing by blending affinity with freshness. */
export function personalRelevance(
  listing: Pick<ListingLike, "category" | "createdAt">,
  scores: AffinityScores,
  now = Date.now(),
): number {
  const affinity = scores[listing.category] ?? 0;
  const ageDays = Math.max(0, (now - +new Date(listing.createdAt)) / 86_400_000);
  const freshness = Math.pow(0.5, ageDays / 7); // 7-day half-life on newness
  return affinity * 100 + freshness * 12;
}

interface ListingLike {
  category: Category;
  createdAt: string;
}

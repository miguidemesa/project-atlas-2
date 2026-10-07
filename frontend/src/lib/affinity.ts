/**
 * Anonymous interest profile kept in localStorage. Weighted events with
 * exponential time decay produce per-category affinity scores. When accounts
 * ship, the same event shape moves server-side so the profile follows the
 * user across devices — this module stays as the anonymous fallback.
 */

export type AffinityEventKind = "view" | "watch" | "search" | "browse";

const KIND_WEIGHTS: Record<AffinityEventKind, number> = { view: 1, watch: 1.6, search: 1.2, browse: 0.6 };

const HALF_LIFE_DAYS = 10;
const STORAGE_KEY = "atlas-affinity.v1";
const MAX_EVENTS = 200;
const SLUG = /^[a-z0-9_]{2,40}$/;
/** Slugs renamed when every game joined the category list; events stored before that still count. */
const RENAMED: Record<string, string> = { nba: "basketball", disney: "lorcana" };

export interface AffinityEvent {
  category: string;
  kind: AffinityEventKind;
  at: number; // epoch ms
}

/** Category slug → share of recent interest. A missing slug means zero. */
export type AffinityScores = Record<string, number>;

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
  if (!SLUG.test(category)) return;
  const events = loadEvents();
  events.push({ category, kind, at: now });
  saveEvents(events);
}

/** Decay-corrected, normalized scores in [0..1]; empty for a cold visitor. */
export function getAffinity(now = Date.now()): AffinityScores {
  const scores = emptyScores();
  const halfLifeMs = HALF_LIFE_DAYS * 86_400_000;
  let total = 0;
  for (const e of loadEvents()) {
    const weight = KIND_WEIGHTS[e.kind] * Math.pow(0.5, Math.max(0, now - e.at) / halfLifeMs);
    scores[e.category] = (scores[e.category] ?? 0) + weight;
    total += weight;
  }
  if (total > 0) for (const key of Object.keys(scores)) scores[key] /= total;
  return scores;
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

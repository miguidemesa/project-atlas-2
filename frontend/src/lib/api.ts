import { getListing, getSeller, listings as seedListings, movers as seedMovers, priceHistory, sellers as seedSellers } from "./data";
import { computeDealScore } from "./deal-score";
import type { Category, Listing, MarketMover, PricePoint, Seller } from "./types";

/**
 * Data access layer with graceful degradation:
 *   1. When NEXT_PUBLIC_API_URL is set, every read hits the Atlas API first.
 *   2. On any failure (or when unset), calls fall back to the local seed
 *      dataset so the UI never breaks during the migration window.
 *
 * The backend owns deal scores long-term (Atlas.Application/Pricing); the
 * local mirror keeps mockups identical until then.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL;

async function getApiData<T>(path: string): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export interface BrowseFilters {
  category?: Category;
  format?: "fixed" | "auction";
  type?: Listing["type"];
  player?: string;
  graded?: boolean;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "ending";
  q?: string;
}

const enrich = (l: Listing): Listing =>
  l.format === "fixed" ? { ...l, dealScore: l.dealScore ?? computeDealScore(l.price, priceHistory(l)) } : l;

// ---------- mock implementations (seed dataset, source = 'seed') ----------

function mockFeed(filters: BrowseFilters): Listing[] {
  let out = [...seedListings];
  if (filters.category) out = out.filter((l) => l.category === filters.category);
  if (filters.format) out = out.filter((l) => l.format === filters.format);
  if (filters.type) out = out.filter((l) => l.type === filters.type);
  if (filters.player) out = out.filter((l) => l.player === filters.player);
  if (filters.graded) out = out.filter((l) => l.graded);
  if (filters.maxPrice) out = out.filter((l) => (l.currentBid ?? l.price) <= filters.maxPrice!);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter(
      (l) => l.title.toLowerCase().includes(q) || l.player.toLowerCase().includes(q) || l.set.toLowerCase().includes(q),
    );
  }
  switch (filters.sort) {
    case "price_asc":
      out.sort((a, b) => (a.currentBid ?? a.price) - (b.currentBid ?? b.price));
      break;
    case "price_desc":
      out.sort((a, b) => (b.currentBid ?? b.price) - (a.currentBid ?? a.price));
      break;
    case "ending":
      out.sort((a, b) => Date.parse(a.endsAt ?? "") - Date.parse(b.endsAt ?? ""));
      break;
    default:
      out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return out.map(enrich);
}

// ---------- public API ----------

export async function fetchFeed(filters: BrowseFilters = {}): Promise<Listing[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "24" });
  if (filters.category) params.set("category", filters.category);
  if (filters.format) params.set("format", filters.format);
  if (filters.type) params.set("type", filters.type);
  if (filters.player) params.set("player", filters.player);
  if (filters.graded) params.set("graded", "true");
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);

  const page = await getApiData<{ items: Listing[] }>(`/listings?${params.toString()}`);
  return (page?.items ?? mockFeed(filters)).map(enrich);
}

export async function fetchListing(
  id: string,
): Promise<{ listing: Listing; seller: Seller; history: PricePoint[] } | null> {
  const remote = await getApiData<{ listing: Listing; seller: Seller; history: PricePoint[] }>(
    `/listings/${id}`,
  );
  if (remote) return { ...remote, listing: enrich(remote.listing) };

  await latency();
  const listing = getListing(id);
  if (!listing) return null;
  return { listing: enrich(listing), seller: getSeller(listing.sellerId), history: priceHistory(listing) };
}

export async function fetchSeller(id: string): Promise<{ seller: Seller; listings: Listing[] } | null> {
  await latency(); // seller profiles endpoint ships with the profile slice
  const seller = seedSellers.find((s) => s.id === id);
  if (!seller) return null;
  return { seller, listings: seedListings.filter((l) => l.sellerId === id).map(enrich) };
}

export async function fetchMovers(): Promise<MarketMover[]> {
  await latency(); // market movers endpoint ships with the analytics slice
  return seedMovers;
}

const latency = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));

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

// ---------- seller actions (Phase B) ----------

export interface CreateListingPayload {
  category: Category;
  player: string;
  team: string;
  year: number;
  set: string;
  parallel?: string;
  graded: boolean;
  gradingCompany?: string;
  gradeValue?: string;
  condition?: string;
  type: Listing["type"];
  format: "fixed" | "auction";
  price: number;
  endsInHours?: number;
}

export async function createListing(
  payload: CreateListingPayload,
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await authFetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? "Could not create the listing." };
    return { ok: true, id: json.data.id as string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function uploadListingPhoto(
  listingId: string,
  file: File,
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ ok: boolean; error?: string }> {
  const body = new FormData();
  body.append("file", file);
  try {
    const res = await authFetch(`/api/listings/${listingId}/photos`, { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? "Photo upload failed." };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Photo upload failed." };
  }
}

export interface SoldListing {
  id: string;
  title: string;
  player: string;
  category: Category;
  price: number;
  imageUrl?: string;
  soldAt: string;
}

export async function fetchRecentlySold(): Promise<SoldListing[]> {
  const data = await getApiData<SoldListing[]>("/listings/sold/recent?limit=6");
  return data ?? [];
}

// ---------- orders (Phase D) ----------

export type OrderStatus =
  | "pending_payment" | "paid_awaiting_shipment" | "shipped"
  | "funds_released" | "disputed" | "cancelled" | "refunded";

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl?: string;
  price: number;
  status: OrderStatus;
  role: "buyer" | "seller";
  shippingAddress?: string;
  trackingNumber?: string;
  createdAt: string;
  reviewed?: boolean;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

const orderRequest = async (
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; order: Order } | { ok: false; error: string }> => {
  try {
    const res = await authFetch(path, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Request failed (${res.status}).` };
    return { ok: true, order: json.data as Order };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
};

export const createOrder = (
  listingId: string,
  shippingAddress: string,
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
) => orderRequest(authFetch, "/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ listingId, shippingAddress }),
});

export interface PayResult {
  ok: boolean;
  error?: string;
  order?: Order;
  checkoutUrl?: string;
}

export const payOrder = async (
  id: string,
  shippingAddress: string | undefined,
  authFetch: (p: string, i?: RequestInit) => Promise<Response>,
): Promise<PayResult> => {
  try {
    const res = await authFetch(`/api/orders/${id}/pay`, {
      method: "POST",
      headers: shippingAddress ? { "Content-Type": "application/json" } : undefined,
      body: shippingAddress ? JSON.stringify({ shippingAddress }) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Payment failed (${res.status}).` };
    const data = json.data;
    if (data?.checkoutUrl) return { ok: true, checkoutUrl: data.checkoutUrl };
    if (data?.order) return { ok: true, order: data.order };
    return { ok: false, error: "Unexpected payment response." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment failed." };
  }
};

export const shipOrder = (id: string, trackingNumber: string, authFetch: (p: string, i?: RequestInit) => Promise<Response>) =>
  orderRequest(authFetch, `/api/orders/${id}/ship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackingNumber }),
  });

export const confirmDelivery = (id: string, authFetch: (p: string, i?: RequestInit) => Promise<Response>) =>
  orderRequest(authFetch, `/api/orders/${id}/confirm-delivery`, { method: "POST" });

export async function fetchMyOrders(
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<Order[]> {
  try {
    const res = await authFetch("/api/orders/mine");
    if (!res.ok) return [];
    const json = await res.json();
    return json.data as Order[];
  } catch {
    return [];
  }
}

export interface PlacedBid {
  newCurrentBid: number;
  endsAtUtc: string;
  totalBids: number;
}

export async function placeBid(
  listingId: string,
  amount: number,
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ ok: true; result: PlacedBid } | { ok: false; error: string }> {
  try {
    const res = await authFetch(`/api/listings/${listingId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Bid failed (${res.status}).` };
    return { ok: true, result: json.data as PlacedBid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ---------- offers (Phase F) ----------

export interface Offer {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingImageUrl?: string;
  amount: number;
  status: "pending" | "accepted" | "countered" | "declined" | "expired" | "withdrawn";
  viewerRole: "buyer" | "seller";
  awaitingViewerResponse: boolean;
  createdAt: string;
  expiresAt: string;
}

const offerRequest = async (
  authFetch: (p: string, i?: RequestInit) => Promise<Response>,
  path: string,
  body?: unknown,
) => {
  try {
    const res = await authFetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: json.error ?? `Failed (${res.status}).` };
    return { ok: true as const, offer: json.data as Offer };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed." };
  }
};

export const makeOffer = (listingId: string, amount: number, authFetch: Parameters<typeof createOrder>[2]) =>
  offerRequest(authFetch, `/api/listings/${listingId}/offers`, { amount });

export const counterOffer = (id: string, amount: number, authFetch: Parameters<typeof createOrder>[2]) =>
  offerRequest(authFetch, `/api/offers/${id}/counter`, { amount });

export const acceptOffer = (id: string, authFetch: Parameters<typeof createOrder>[2]) =>
  offerRequest(authFetch, `/api/offers/${id}/accept`);

export const declineOffer = (id: string, authFetch: Parameters<typeof createOrder>[2]) =>
  offerRequest(authFetch, `/api/offers/${id}/decline`);

export function fetchMyOffers(
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ incoming: Offer[]; outgoing: Offer[] }> {
  return authFetch("/api/offers/mine")
    .then((r) => r.json())
    .then((j) => j.data ?? { incoming: [], outgoing: [] })
    .catch(() => ({ incoming: [], outgoing: [] }));
}

// ---------- reviews (Phase F) ----------

export interface SellerReview {
  id: string;
  rating: number;
  content?: string;
  reviewerMasked: string;
  createdAt: string;
}

export async function postReview(
  orderId: string,
  rating: number,
  content: string,
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authFetch(`/api/orders/${orderId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, content }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? "Review failed." };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Review failed." };
  }
}

export async function fetchSellerReviews(sellerId: string): Promise<{ avg: number; count: number; items: SellerReview[] }> {
  const data = await getApiData<{ avg: number; count: number; items: SellerReview[] }>(
    `/sellers/${sellerId}/reviews`,
  );
  return data ?? { avg: 0, count: 0, items: [] };
}

// ---------- vision (AI layer) ----------

export interface CardScan {
  player?: string;
  set?: string;
  year?: number;
  parallel?: string;
  confidence: number;
  isMock: boolean;
}

export async function scanCard(
  file: File,
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ ok: true; scan: CardScan } | { ok: false; error: string }> {
  try {
    const body = new FormData();
    body.append("image", file);
    const res = await authFetch("/api/vision/scan-card", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? "Scan failed." };
    return { ok: true, scan: json.data as CardScan };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Scan failed." };
  }
}

// ---------- NL search parsing ----------

export interface ParsedSearch {
  category?: Category;
  format?: "fixed" | "auction";
  type?: Listing["type"];
  graded?: boolean;
  maxPrice?: number;
}

export async function parseSearchQuery(q: string): Promise<ParsedSearch | null> {
  const data = await getApiData<ParsedSearch>("/search/parse");
  if (data !== null) return data;
  // POST fallback shape
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    if (!res.ok) return null;
    return ((await res.json()).data ?? null) as ParsedSearch | null;
  } catch {
    return null;
  }
}

export interface CompetingResult {
  count: number;
  min: number;
  median: number;
  max: number;
}

export async function competingPriceCheck(
  params: { player: string; year: number; set: string; parallel?: string },
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<CompetingResult | null> {
  try {
    const qs = new URLSearchParams({
      player: params.player,
      year: String(params.year),
      set: params.set,
      ...(params.parallel ? { parallel: params.parallel } : {}),
    });
    const res = await authFetch(`/api/listings/competing?${qs.toString()}`);
    if (!res.ok) return null;
    return (await res.json()).data as CompetingResult;
  } catch {
    return null;
  }
}

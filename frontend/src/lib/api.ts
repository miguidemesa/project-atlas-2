import { cache } from "react";
import { apiGet, apiGetOrNull, apiUrl } from "./http";
import type { Category, CategoryInfo, Listing, ListingDetail, ListingType, Paged, SellerPage, Storefront } from "./types";

// ---------- reads: real API only (failures throw; pages show app/error.tsx) ----------

export interface ListingQuery {
  category?: string;
  format?: "fixed" | "auction";
  type?: ListingType;
  player?: string;
  graded?: boolean;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  q?: string;
  sort?: "newest" | "popular" | "price_asc" | "price_desc" | "ending";
  page?: number;
  pageSize?: number;
}

const FEED_KEYS = ["category", "format", "type", "player", "language", "sort", "q"] as const;

/** Path and query for GET /api/listings, with only the filters that are set. */
export function feedQuery(f: ListingQuery): string {
  const params = new URLSearchParams({ page: String(f.page ?? 1), pageSize: String(f.pageSize ?? 24) });
  for (const key of FEED_KEYS) {
    const value = f[key];
    if (value) params.set(key, value);
  }
  if (f.graded) params.set("graded", "true");
  if (f.minPrice) params.set("minPrice", String(f.minPrice));
  if (f.maxPrice) params.set("maxPrice", String(f.maxPrice));
  return `/listings?${params.toString()}`;
}

/** The next page for "Load more", or undefined once everything is on screen. */
export function nextPage(last: Paged<unknown>): number | undefined {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined;
}

export const loadFeed = (f: ListingQuery = {}) => apiGet<Paged<Listing>>(feedQuery(f));

export const loadStorefront = (category?: string) =>
  apiGet<Storefront>(category ? `/storefront?category=${encodeURIComponent(category)}` : "/storefront");

export const loadCategories = () => apiGet<CategoryInfo[]>("/categories");

/** Cached per request so generateMetadata and the page share one call. */
export const loadListing = cache((id: string) =>
  apiGetOrNull<ListingDetail>(`/listings/${encodeURIComponent(id)}`, { cache: "no-store" }),
);

export const loadSeller = (id: string) => apiGetOrNull<SellerPage>(`/sellers/${encodeURIComponent(id)}`);

export const loadSellerReviews = (sellerId: string) =>
  apiGet<{ avg: number; count: number; items: SellerReview[] }>(`/sellers/${encodeURIComponent(sellerId)}/reviews`);

// ---------- seller actions (Phase B) ----------

export interface CreateListingPayload {
  category: Category;
  player: string;
  team?: string;
  year?: number;
  set: string;
  cardNumber?: string;
  language: string;
  parallel?: string;
  serialNumber?: string;
  graded: boolean;
  gradingCompany?: string;
  gradeValue?: string;
  condition?: string;
  type: Listing["type"];
  format: "fixed" | "auction";
  price: number;
  endsInHours?: number;
  description?: string;
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
  usePoints: boolean,
  authFetch: (p: string, i?: RequestInit) => Promise<Response>,
): Promise<PayResult> => {
  try {
    const body: Record<string, unknown> = {};
    if (shippingAddress) body.shippingAddress = shippingAddress;
    if (usePoints) body.usePoints = true;
    const res = await authFetch(`/api/orders/${id}/pay`, {
      method: "POST",
      headers: Object.keys(body).length ? { "Content-Type": "application/json" } : undefined,
      body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Payment failed (${res.status}).` };
    const data = json.data ?? {};
    if (data.checkoutUrl) return { ok: true, checkoutUrl: data.checkoutUrl as string };
    if (data.order) return { ok: true, order: data.order as Order, discountApplied: data.discountApplied as number | undefined };
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
  content: string | null;
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
  try {
    const res = await fetch(apiUrl("/search/parse"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    if (!res.ok) return null;
    return ((await res.json()).data ?? null) as ParsedSearch | null;
  } catch {
    return null; // search still works as plain text without the parser
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

export interface RewardHistory { id: string; delta: number; kind: string; createdAt: string; }

export async function fetchMyRewards(
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{ balance: number; history: RewardHistory[] }> {
  try {
    const res = await authFetch("/api/rewards/mine");
    if (!res.ok) return { balance: 0, history: [] };
    return (await res.json()).data ?? { balance: 0, history: [] };
  } catch {
    return { balance: 0, history: [] };
  }
}

export function maxRedeemable(balance: number, orderPrice: number): number {
  return Math.min(Math.floor(balance * 0.25), Math.floor(orderPrice * 0.2));
}

export interface PayResult {
  ok: boolean;
  error?: string;
  order?: Order;
  checkoutUrl?: string;
  discountApplied?: number;
}

import type { ParsedSearch, SellerReview } from "./actions";
import type { ApiClient } from "./client";
import type { NotificationPreference } from "./notifications";
import type { CardGroup, CategoryInfo, Listing, ListingDetail, ListingType, Paged, SellerPage, Storefront } from "./types";

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
  /** A card key from a CardGroup: every live listing of that card (the compare view). */
  card?: string;
  sort?: "newest" | "popular" | "price_asc" | "price_desc" | "ending";
  page?: number;
  pageSize?: number;
}

const FEED_KEYS = ["category", "format", "type", "player", "language", "sort", "q", "card"] as const;

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

/** GET /api/app-config: an app older than minimumAppVersion shows "Update Atlas". */
export interface AppConfig {
  minimumAppVersion: string;
}

const sendJson = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Every read the web and the app share, bound to one client. Failures throw an ApiError; screens show an
 * error with Try again, never stand-in data.
 */
export function createEndpoints(client: ApiClient) {
  return {
    loadFeed: (f: ListingQuery = {}) => client.get<Paged<Listing>>(feedQuery(f)),
    loadStorefront: (category?: string) =>
      client.get<Storefront>(category ? `/storefront?category=${encodeURIComponent(category)}` : "/storefront"),
    loadCategories: () => client.get<CategoryInfo[]>("/categories"),
    /** The same card from several sellers grouped into one tile, newest first. */
    loadCardGroups: (category?: string, take = 12) =>
      client.get<CardGroup[]>(`/listings/groups?${new URLSearchParams({ ...(category ? { category } : {}), take: String(take) })}`),
    loadListing: (id: string) =>
      client.getOrNull<ListingDetail>(`/listings/${encodeURIComponent(id)}`, { cache: "no-store" }),
    loadSeller: (id: string) => client.getOrNull<SellerPage>(`/sellers/${encodeURIComponent(id)}`),
    loadSellerReviews: (sellerId: string) =>
      client.get<{ avg: number; count: number; items: SellerReview[] }>(`/sellers/${encodeURIComponent(sellerId)}/reviews`),
    /** Search still works as plain text when the parser can't be reached, so this never throws. */
    parseSearchQuery: async (q: string): Promise<ParsedSearch | null> => {
      try {
        const res = await fetch(client.url("/search/parse"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        if (!res.ok) return null;
        return ((await res.json()).data ?? null) as ParsedSearch | null;
      } catch {
        return null;
      }
    },
    registerDevice: (token: string, platform: "ios" | "android") =>
      client.authed<{ token: string; platform: string }>("/me/devices", sendJson("POST", { token, platform })),
    unregisterDevice: (token: string) =>
      client.authed<void>(`/me/devices/${encodeURIComponent(token)}`, { method: "DELETE" }),
    loadNotificationPreferences: () => client.authed<NotificationPreference[]>("/me/notification-preferences"),
    saveNotificationPreferences: (preferences: NotificationPreference[]) =>
      client.authed<NotificationPreference[]>("/me/notification-preferences", sendJson("PUT", { preferences })),
    /** Development builds only: the API answers 404 elsewhere. */
    sendTestAlert: () => client.authed<{ id: string }>("/me/notifications/test", { method: "POST" }),
    loadAppConfig: () => client.get<AppConfig>("/app-config"),
    /** 204 when the account is anonymized; 409 with what to finish first while something is still open. */
    deleteAccount: () => client.authed<void>("/me", { method: "DELETE" }),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;

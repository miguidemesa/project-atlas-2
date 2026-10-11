import type { ListingQuery } from "./endpoints";

/** TanStack Query keys shared by the web and the app, so both cache the same data under the same key. */
export const queryKeys = {
  feed: (q: ListingQuery) => ["feed", q] as const,
  storefront: (category?: string) => ["storefront", category ?? "home"] as const,
  notificationPreferences: () => ["me", "notification-preferences"] as const,
  appConfig: () => ["app-config"] as const,
  categories: () => ["categories"] as const,
  listing: (id: string) => ["listing", id] as const,
  seller: (id: string) => ["seller", id] as const,
  cardGroups: (category?: string) => ["card-groups", category ?? "all"] as const,
};

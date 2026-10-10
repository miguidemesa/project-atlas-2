import { cache } from "react";
import { createClient, createEndpoints, type AuthSession, type AuthUser, type TokenStore } from "@atlas/api";

// The web's binding of @atlas/api: where the web keeps tokens and what happens when a session ends.
// Pages keep importing loaders and actions from "@/lib/api"; types and helpers come from @atlas/api.
export * from "@atlas/api";

const STORAGE_KEY = "atlas-auth.v1";

/** Fired on window when the API refuses to refresh the session; AuthProvider then signs the person out. */
export const SIGNED_OUT_EVENT = "atlas:signed-out";

/** The shape the web has stored since before M1, kept so nobody is signed out by this change. */
interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
}

export function loadStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null; // a corrupted entry means signed out
  }
}

export const localTokenStore: TokenStore = {
  getAccessToken: async () => loadStoredAuth()?.accessToken ?? null,
  getRefreshToken: async () => loadStoredAuth()?.refreshToken ?? null,
  save: async ({ tokens, user }: AuthSession) => {
    const stored: StoredAuth = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.accessTokenExpiresAt,
      user,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  },
  clear: async () => window.localStorage.removeItem(STORAGE_KEY),
};

export const webClient = createClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080",
  tokenStore: localTokenStore,
  onSignedOut: () => window.dispatchEvent(new Event(SIGNED_OUT_EVENT)),
});

const endpoints = createEndpoints(webClient);

export const { loadFeed, loadStorefront, loadCategories, loadSeller, loadSellerReviews, parseSearchQuery } = endpoints;

/** Cached per request so generateMetadata and the page share one call. */
export const loadListing = cache(endpoints.loadListing);

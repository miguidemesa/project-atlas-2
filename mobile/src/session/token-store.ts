import * as SecureStore from "expo-secure-store";
import type { AuthUser, TokenStore } from "@atlas/api";

const KEY = "atlas.session";

interface Stored {
  refreshToken: string;
  user: AuthUser;
}

/** The access token lives in memory only; a cold start gets a new one through the refresh token. */
let accessToken: string | null = null;

async function readStored(): Promise<Stored | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Stored;
  } catch {
    return null; // an unreadable entry means signed out
  }
}

/** The refresh token (and who it belongs to) in the iOS Keychain or Android Keystore. */
export const secureTokenStore: TokenStore & { getUser(): Promise<AuthUser | null> } = {
  getAccessToken: async () => accessToken,
  getRefreshToken: async () => (await readStored())?.refreshToken ?? null,
  getUser: async () => (await readStored())?.user ?? null,
  async save({ tokens, user }) {
    accessToken = tokens.accessToken;
    const stored: Stored = { refreshToken: tokens.refreshToken, user };
    await SecureStore.setItemAsync(KEY, JSON.stringify(stored));
  },
  async clear() {
    accessToken = null;
    await SecureStore.deleteItemAsync(KEY);
  },
};

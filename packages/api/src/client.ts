import { ApiError, apiUrl, readData } from "./http";
import type { AuthSession } from "./session";

/** Where a platform keeps the session: the web uses localStorage; the app keeps the refresh token in the Keychain or Keystore and the access token in memory. */
export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  save(session: AuthSession): Promise<void>;
  clear(): Promise<void>;
}

export interface ClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  /** Runs once when the API refuses to refresh the session, after the tokens are cleared. */
  onSignedOut: () => void;
}

export type ApiClient = ReturnType<typeof createClient>;

export function createClient({ baseUrl, tokenStore, onSignedOut }: ClientOptions) {
  let refreshing: Promise<boolean> | null = null;

  function send(path: string, init: RequestInit = {}, token?: string | null): Promise<Response> {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(apiUrl(baseUrl, path), { ...init, headers });
  }

  const post = (path: string, body: unknown) =>
    send(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const withToken = async (path: string, init: RequestInit) => send(path, init, await tokenStore.getAccessToken());

  /** One refresh at a time: every request that hit a 401 waits for the same one. */
  function refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) return false; // never signed in: nothing to end
      const res = await post("/auth/refresh", { refreshToken });
      // only a refused session ends here; offline or a 5xx throws below and keeps the tokens
      if (res.status === 400 || res.status === 401) {
        await tokenStore.clear();
        onSignedOut();
        return false;
      }
      await tokenStore.save(await readData<AuthSession>(res));
      return true;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /**
   * A signed-in request. On a 401 it refreshes the session once and retries the request once. The retry
   * is safe for money actions: the API rejects an unauthenticated request before running it.
   */
  async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await withToken(path, init);
    if (res.status !== 401) return res;
    if (!(await refresh())) throw new ApiError(401, "Sign in to continue.");
    return withToken(path, init);
  }

  async function start(path: string, body: Record<string, string>): Promise<AuthSession> {
    const session = await readData<AuthSession>(await post(path, body));
    await tokenStore.save(session);
    return session;
  }

  async function get<T>(path: string, init?: RequestInit): Promise<T> {
    return readData<T>(await send(path, init));
  }

  async function getOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      return await get<T>(path, init);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async function authed<T>(path: string, init?: RequestInit): Promise<T> {
    return readData<T>(await authFetch(path, init));
  }

  return {
    get,
    getOrNull,
    authFetch,
    authed,
    url: (path: string) => apiUrl(baseUrl, path),
    signIn: (email: string, password: string) => start("/auth/login", { email, password }),
    register: (email: string, name: string, password: string) => start("/auth/register", { email, name, password }),
    signOut: () => tokenStore.clear(),
  };
}

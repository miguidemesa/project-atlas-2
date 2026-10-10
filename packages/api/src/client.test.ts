import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, type TokenStore } from "./client";
import { ApiError } from "./http";
import type { AuthSession } from "./session";

const BASE = "http://api.test";

const session = (n: number): AuthSession => ({
  tokens: { accessToken: `access-${n}`, accessTokenExpiresAt: "2026-10-05T00:15:00Z", refreshToken: `refresh-${n}` },
  user: { id: "u1", email: "ana@example.com", name: "Ana Reyes", role: "buyer" },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** An in-memory store, standing in for the app's (memory and Keychain) and the web's (localStorage). */
function memoryStore(start: AuthSession | null): TokenStore & { current: AuthSession | null } {
  const store = {
    current: start,
    getAccessToken: async () => store.current?.tokens.accessToken ?? null,
    getRefreshToken: async () => store.current?.tokens.refreshToken ?? null,
    save: async (s: AuthSession) => {
      store.current = s;
    },
    clear: async () => {
      store.current = null;
    },
  };
  return store;
}

/** A fake API: every route but refresh accepts only "Bearer access-2"; refresh answers with `refresh()`. */
function fakeApi(refresh: () => Response | Promise<Response>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.slice(BASE.length);
      calls.push(path);
      if (path === "/api/auth/refresh") return refresh();
      return new Headers(init?.headers).get("Authorization") === "Bearer access-2"
        ? json(200, { data: { ok: true } })
        : json(401, { error: "Unauthorized" });
    }),
  );
  return { calls };
}

afterEach(() => vi.unstubAllGlobals());

describe("authFetch", () => {
  it("sends the access token and leaves good responses alone", async () => {
    const { calls } = fakeApi(() => json(500, {}));
    const client = createClient({ baseUrl: BASE, tokenStore: memoryStore(session(2)), onSignedOut: vi.fn() });

    await expect(client.authed("/me")).resolves.toEqual({ ok: true });
    expect(calls).toEqual(["/api/me"]);
  });

  it("refreshes once for many concurrent 401s, then retries each request once", async () => {
    const store = memoryStore(session(1));
    const { calls } = fakeApi(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10)); // keeps the refresh in flight while the others arrive
      return json(200, { data: session(2) });
    });
    const client = createClient({ baseUrl: BASE, tokenStore: store, onSignedOut: vi.fn() });

    const results = await Promise.all([client.authed("/me"), client.authed("/me/devices"), client.authed("/orders/mine")]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(calls.filter((c) => c === "/api/auth/refresh")).toHaveLength(1);
    expect(calls).toHaveLength(7); // three refused, one refresh, three retried
    expect(store.current?.tokens.refreshToken).toBe("refresh-2");
  });

  it("signs out once and throws when the server refuses the refresh", async () => {
    const store = memoryStore(session(1));
    const onSignedOut = vi.fn();
    fakeApi(() => json(400, { error: "Session expired. Please sign in again." }));
    const client = createClient({ baseUrl: BASE, tokenStore: store, onSignedOut });

    const results = await Promise.allSettled([client.authed("/me"), client.authed("/me/devices")]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect((results[0] as PromiseRejectedResult).reason).toEqual(new ApiError(401, "Sign in to continue."));
    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(store.current).toBeNull();
  });

  it("keeps the session when the refresh fails because the phone is offline or the API is down", async () => {
    const failures = [
      () => Promise.reject(new TypeError("Network request failed")),
      () => json(503, { error: "Down for maintenance." }),
    ];
    for (const failure of failures) {
      const store = memoryStore(session(1));
      const onSignedOut = vi.fn();
      fakeApi(failure);
      const client = createClient({ baseUrl: BASE, tokenStore: store, onSignedOut });

      await expect(client.authed("/me")).rejects.toThrow();
      expect(onSignedOut).not.toHaveBeenCalled();
      expect(store.current?.tokens.refreshToken).toBe("refresh-1");
    }
  });

  it("retries only once: a second 401 goes back to the caller", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.endsWith("/auth/refresh") ? json(200, { data: session(3) }) : json(401, { error: "Unauthorized" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({ baseUrl: BASE, tokenStore: memoryStore(session(1)), onSignedOut: vi.fn() });

    const res = await client.authFetch("/me");

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3); // the request, one refresh, one retry
  });

  it("asks a signed-out person to sign in without ending anything", async () => {
    const onSignedOut = vi.fn();
    const { calls } = fakeApi(() => json(500, {}));
    const client = createClient({ baseUrl: BASE, tokenStore: memoryStore(null), onSignedOut });

    await expect(client.authed("/me")).rejects.toEqual(new ApiError(401, "Sign in to continue."));
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(calls).toEqual(["/api/me"]);
  });
});

describe("signIn, register and signOut", () => {
  it("stores the session the API returns", async () => {
    const store = memoryStore(null);
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(200, { data: session(1) }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({ baseUrl: BASE, tokenStore: store, onSignedOut: vi.fn() });

    await expect(client.signIn("ana@example.com", "Password123")).resolves.toEqual(session(1));

    expect(store.current).toEqual(session(1));
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/auth/login`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "ana@example.com", password: "Password123" }) }),
    );
  });

  it("passes the API's reason through when sign-in fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(400, { error: "Email or password is incorrect." })));
    const client = createClient({ baseUrl: BASE, tokenStore: memoryStore(null), onSignedOut: vi.fn() });

    await expect(client.signIn("ana@example.com", "wrong")).rejects.toEqual(new ApiError(400, "Email or password is incorrect."));
  });

  it("registers with a name, and signing out forgets both tokens", async () => {
    const store = memoryStore(null);
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(200, { data: session(1) }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({ baseUrl: BASE, tokenStore: store, onSignedOut: vi.fn() });

    await client.register("ana@example.com", "Ana Reyes", "Password123");
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/auth/register`,
      expect.objectContaining({ body: JSON.stringify({ email: "ana@example.com", name: "Ana Reyes", password: "Password123" }) }),
    );

    await client.signOut();
    expect(store.current).toBeNull();
  });
});

describe("public reads", () => {
  it("get unwraps data and getOrNull maps 404 to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.endsWith("/missing") ? json(404, { error: "Listing not found." }) : json(200, { data: [1, 2] }))),
    );
    const client = createClient({ baseUrl: BASE, tokenStore: memoryStore(null), onSignedOut: vi.fn() });

    await expect(client.get("/listings")).resolves.toEqual([1, 2]);
    await expect(client.getOrNull("/listings/missing")).resolves.toBeNull();
  });

  it("getOrNull still throws other failures, so screens show an error instead of stand-in data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(503, {})));
    const client = createClient({ baseUrl: BASE, tokenStore: memoryStore(null), onSignedOut: vi.fn() });

    await expect(client.getOrNull("/listings/x")).rejects.toBeInstanceOf(ApiError);
  });
});

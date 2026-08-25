"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "atlas-auth.v1";
const BASE = process.env.NEXT_PUBLIC_API_URL;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let refreshInFlight: Promise<boolean> | null = null;

function load(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function save(auth: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (auth) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  else window.localStorage.removeItem(STORAGE_KEY);
}

async function rotateRefreshToken(refreshToken: string): Promise<StoredAuth | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    const auth: StoredAuth = {
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
      expiresAt: data.tokens.accessTokenExpiresAt,
      user: data.user,
    };
    save(auth);
    return auth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(load()?.user ?? null);
  }, []);

  const applyAuth = useCallback((auth: StoredAuth | null) => {
    save(auth);
    setUser(auth?.user ?? null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!BASE) return { ok: false, error: "Accounts go live with the API launch." };
      try {
        const res = await fetch(`${BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!res.ok) return { ok: false, error: json.error ?? "Sign-in failed." };
        applyAuth({
          accessToken: json.data.tokens.accessToken,
          refreshToken: json.data.tokens.refreshToken,
          expiresAt: json.data.tokens.accessTokenExpiresAt,
          user: json.data.user,
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not reach the server. Try again." };
      }
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      if (!BASE) return { ok: false, error: "Accounts go live with the API launch." };
      try {
        const res = await fetch(`${BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, password }),
        });
        const json = await res.json();
        if (!res.ok) return { ok: false, error: json.error ?? "Registration failed." };
        applyAuth({
          accessToken: json.data.tokens.accessToken,
          refreshToken: json.data.tokens.refreshToken,
          expiresAt: json.data.tokens.accessTokenExpiresAt,
          user: json.data.user,
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not reach the server. Try again." };
      }
    },
    [applyAuth],
  );

  const logout = useCallback(() => applyAuth(null), [applyAuth]);

  /** Fetch with Bearer token; rotates the refresh token once on 401 then retries. */
  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      let auth = load();
      if (!auth || !BASE) throw new Error("Not signed in.");

      const doFetch = (accessToken: string) =>
        fetch(`${BASE}${path}`, {
          ...init,
          headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
        });

      let res = await doFetch(auth.accessToken);
      if (res.status === 401) {
        refreshInFlight ??= rotateRefreshToken(auth.refreshToken).then((a) => a !== null).finally(() => {
          refreshInFlight = null;
        });
        const refreshed = await refreshInFlight;
        if (!refreshed) {
          applyAuth(null);
          throw new Error("Session expired. Please sign in again.");
        }
        auth = load();
        res = await doFetch(auth!.accessToken);
      }
      return res;
    },
    [applyAuth],
  );

  const value = useMemo(
    () => ({ user, login, register, logout, authFetch }),
    [user, login, register, logout, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

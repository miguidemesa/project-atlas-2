"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, type AuthSession, type AuthUser } from "@atlas/api";
import { SIGNED_OUT_EVENT, loadStoredAuth, webClient } from "./api";

type Outcome = { ok: boolean; error?: string };

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<Outcome>;
  register: (email: string, name: string, password: string) => Promise<Outcome>;
  logout: () => void;
  /** Fetch with the signed-in person's token; @atlas/api refreshes it once on a 401 and retries once. */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(loadStoredAuth()?.user ?? null);
    const signedOut = () => setUser(null);
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  }, []);

  const start = useCallback(async (begin: () => Promise<AuthSession>): Promise<Outcome> => {
    try {
      setUser((await begin()).user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.message : "Could not reach the server. Try again." };
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => start(() => webClient.signIn(email, password)),
    [start],
  );
  const register = useCallback(
    (email: string, name: string, password: string) => start(() => webClient.register(email, name, password)),
    [start],
  );
  const logout = useCallback(() => {
    void webClient.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout, authFetch: webClient.authFetch }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

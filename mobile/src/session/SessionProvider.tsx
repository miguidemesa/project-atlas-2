import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DeviceEventEmitter } from "react-native";
import type { AuthUser } from "@atlas/api";
import { api, SIGNED_OUT, client } from "@/api/client";
import { unregisterThisPhone } from "@/push/push";
import { secureTokenStore } from "./token-store";

export interface Session {
  user: AuthUser | null;
  /** False until the stored session has been read at launch. */
  ready: boolean;
  signIn(email: string, password: string): Promise<void>;
  register(email: string, name: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/** Who is signed in. The refresh token stays in the secure store; this holds only the person. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void secureTokenStore
      .getUser()
      .catch(() => null) // an unreadable Keychain entry means signed out
      .then((stored) => {
        setUser(stored);
        setReady(true);
      });
    const ended = DeviceEventEmitter.addListener(SIGNED_OUT, () => {
      queryClient.clear();
      setUser(null);
    });
    return () => ended.remove();
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser((await client.signIn(email, password)).user);
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    setUser((await client.register(email, name, password)).user);
  }, []);

  const signOut = useCallback(async () => {
    await unregisterThisPhone(); // first, while the access token still works
    await client.signOut();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  /** Throws the API's refusal (what to finish first) and changes nothing; on success signs out here too. */
  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await unregisterThisPhone(); // the API already removed the phone; this forgets it locally
    await client.signOut();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, ready, signIn, register, signOut, deleteAccount }),
    [user, ready, signIn, register, signOut, deleteAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}

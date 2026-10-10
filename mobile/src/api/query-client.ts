import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";

export const DAY = 24 * 60 * 60 * 1000;
const FRESH_FOR = 60_000;

/**
 * The app's query cache. Mutations never pause and replay: offline they fail at once and the person
 * retries, because money and commitments are never queued.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { gcTime: DAY, staleTime: FRESH_FOR },
      mutations: { networkMode: "always", retry: 0 },
    },
  });
}

/**
 * Screens opened before keep showing offline for a day. Only successful reads are saved; mutations never
 * are, and the root layout never calls resumePausedMutations, so nothing replays later. A new app version
 * starts with an empty cache.
 */
export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: "atlas.query-cache" }),
  maxAge: DAY,
  buster: Constants.expoConfig?.version ?? "dev",
  dehydrateOptions: { shouldDehydrateMutation: () => false },
};

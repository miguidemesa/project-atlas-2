import { QueryClient } from "@tanstack/react-query";

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

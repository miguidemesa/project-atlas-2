import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { createQueryClient } from "@/api/query-client";
import { SessionProvider } from "@/session/SessionProvider";

/** The app's query client without retries, so a failing request shows its error at once in tests. */
export function testQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  return client;
}

export function renderApp(ui: ReactElement, queryClient: QueryClient = testQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{ui}</SessionProvider>
    </QueryClientProvider>,
  );
}

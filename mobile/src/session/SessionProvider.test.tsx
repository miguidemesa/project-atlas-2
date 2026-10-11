import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { client } from "@/api/client";
import { unregisterThisPhone } from "@/push/push";
import { fakeApi } from "@/test/fake-api";
import { testQueryClient } from "@/test/render";
import { ANA } from "@/test/session";
import { SessionProvider, useSession } from "./SessionProvider";
import { secureTokenStore } from "./token-store";

jest.mock("@/push/push", () => ({ unregisterThisPhone: jest.fn(async () => undefined) }));

const wrapperFor =
  (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );

afterEach(() => secureTokenStore.clear());

it("restores the signed-in person at launch", async () => {
  await secureTokenStore.save(ANA);

  const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(testQueryClient()) });

  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.user?.name).toBe("Ana Reyes");
});

it("signs in, then signs out by forgetting both tokens and the cached data", async () => {
  fakeApi({ "POST /api/auth/login": [200, { data: ANA }] });
  const queryClient = testQueryClient();
  queryClient.setQueryData(["me", "notification-preferences"], [{ category: "bids", pushEnabled: true }]);
  const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(queryClient) });

  await act(() => result.current.signIn("ana@example.com", "Password123"));
  expect(result.current.user?.email).toBe("ana@example.com");

  await act(() => result.current.signOut());
  expect(result.current.user).toBeNull();
  expect(unregisterThisPhone).toHaveBeenCalledTimes(1);
  expect(await secureTokenStore.getRefreshToken()).toBeNull();
  expect(queryClient.getQueryData(["me", "notification-preferences"])).toBeUndefined();
});

it("signs out when the API ends the session", async () => {
  await secureTokenStore.save(ANA);
  fakeApi({
    "GET /api/me/notification-preferences": [401, { error: "Unauthorized" }],
    "POST /api/auth/refresh": [400, { error: "Session expired. Please sign in again." }],
  });
  const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(testQueryClient()) });
  await waitFor(() => expect(result.current.user).not.toBeNull());

  await act(async () => {
    await client.authed("/me/notification-preferences").catch(() => undefined);
  });

  await waitFor(() => expect(result.current.user).toBeNull());
});

import { afterEach, describe, expect, it } from "vitest";
import { loadStoredAuth, localTokenStore } from "./api";

const session = {
  tokens: { accessToken: "a2", accessTokenExpiresAt: "2026-10-05T00:15:00Z", refreshToken: "r2" },
  user: { id: "u1", email: "ana@example.com", name: "Ana Reyes", role: "buyer" },
};

afterEach(() => window.localStorage.clear());

describe("localTokenStore", () => {
  it("reads sessions saved before the upgrade, so nobody is signed out by it", async () => {
    window.localStorage.setItem(
      "atlas-auth.v1",
      JSON.stringify({ accessToken: "a1", refreshToken: "r1", expiresAt: "2026-10-05T00:00:00Z", user: session.user }),
    );

    await expect(localTokenStore.getAccessToken()).resolves.toBe("a1");
    await expect(localTokenStore.getRefreshToken()).resolves.toBe("r1");
  });

  it("saves in the same shape and clears both tokens", async () => {
    await localTokenStore.save(session);
    expect(loadStoredAuth()).toEqual({ accessToken: "a2", refreshToken: "r2", expiresAt: "2026-10-05T00:15:00Z", user: session.user });

    await localTokenStore.clear();
    await expect(localTokenStore.getRefreshToken()).resolves.toBeNull();
  });

  it("treats a corrupted entry as signed out", async () => {
    window.localStorage.setItem("atlas-auth.v1", "{not json");
    await expect(localTokenStore.getAccessToken()).resolves.toBeNull();
  });
});

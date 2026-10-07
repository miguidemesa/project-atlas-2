import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiGetOrNull, apiUrl } from "./http";

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );

afterEach(() => vi.unstubAllGlobals());

describe("apiUrl", () => {
  it("adds /api exactly once", () => {
    expect(apiUrl("/listings")).toBe("http://localhost:5080/api/listings");
    expect(apiUrl("/api/listings")).toBe("http://localhost:5080/api/listings");
    expect(apiUrl("listings")).toBe("http://localhost:5080/api/listings");
  });
});

describe("apiGet", () => {
  it("unwraps the data envelope", async () => {
    vi.stubGlobal("fetch", respond(200, { data: { items: [1] } }));
    await expect(apiGet<{ items: number[] }>("/listings")).resolves.toEqual({ items: [1] });
  });

  it("throws the server's message instead of returning stand-in data", async () => {
    vi.stubGlobal("fetch", respond(500, { error: "boom" }));
    await expect(apiGet("/listings")).rejects.toMatchObject({ status: 500, message: "boom" });
  });

  it("throws when the API can't be reached at all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(apiGet("/listings")).rejects.toThrow("fetch failed");
  });
});

describe("apiGetOrNull", () => {
  it("maps 404 to null but still throws on other errors", async () => {
    vi.stubGlobal("fetch", respond(404, { error: "Listing not found." }));
    await expect(apiGetOrNull("/listings/x")).resolves.toBeNull();

    vi.stubGlobal("fetch", respond(503, {}));
    await expect(apiGetOrNull("/listings/x")).rejects.toBeInstanceOf(ApiError);
  });
});

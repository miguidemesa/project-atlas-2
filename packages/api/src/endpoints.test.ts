import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, type TokenStore } from "./client";
import { createEndpoints, feedQuery, nextPage } from "./endpoints";

describe("feedQuery", () => {
  it("sends only the filters that are set", () => {
    expect(feedQuery({})).toBe("/listings?page=1&pageSize=24");
    expect(feedQuery({ category: "pokemon", graded: true, minPrice: 500, sort: "ending" })).toBe(
      "/listings?page=1&pageSize=24&category=pokemon&sort=ending&graded=true&minPrice=500",
    );
  });

  it("encodes free text", () => {
    expect(feedQuery({ q: "100% pikachu" })).toBe("/listings?page=1&pageSize=24&q=100%25+pikachu");
  });
});

describe("nextPage", () => {
  it("asks for another page only while results remain", () => {
    expect(nextPage({ items: [], total: 50, page: 1, pageSize: 24 })).toBe(2);
    expect(nextPage({ items: [], total: 48, page: 2, pageSize: 24 })).toBeUndefined();
  });
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const signedOut: TokenStore = {
  getAccessToken: async () => null,
  getRefreshToken: async () => null,
  save: async () => undefined,
  clear: async () => undefined,
};

const api = createEndpoints(createClient({ baseUrl: "http://api.test", tokenStore: signedOut, onSignedOut: () => undefined }));

afterEach(() => vi.unstubAllGlobals());

describe("createEndpoints", () => {
  it("calls the right path for every read", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(200, { data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await api.loadFeed({ category: "pokemon" });
    await api.loadStorefront();
    await api.loadStorefront("one_piece");
    await api.loadCategories();
    await api.loadListing("a b");
    await api.loadSeller("s1");
    await api.loadSellerReviews("s1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://api.test/api/listings?page=1&pageSize=24&category=pokemon",
      "http://api.test/api/storefront",
      "http://api.test/api/storefront?category=one_piece",
      "http://api.test/api/categories",
      "http://api.test/api/listings/a%20b",
      "http://api.test/api/sellers/s1",
      "http://api.test/api/sellers/s1/reviews",
    ]);
  });

  it("maps a missing listing or seller to null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(404, { error: "Not found." })));

    await expect(api.loadListing("x")).resolves.toBeNull();
    await expect(api.loadSeller("x")).resolves.toBeNull();
  });

  it("falls back to plain-text search when the parser can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Network request failed"))));
    await expect(api.parseSearchQuery("graded charizard")).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => json(500, {})));
    await expect(api.parseSearchQuery("graded charizard")).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => json(200, { data: { category: "pokemon", graded: true } })));
    await expect(api.parseSearchQuery("graded charizard")).resolves.toEqual({ category: "pokemon", graded: true });
  });
});

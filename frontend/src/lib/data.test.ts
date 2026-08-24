import { describe, expect, it } from "vitest";
import { listings, sellers, priceHistory, movers, getSeller, getListing } from "./data";
import { fetchFeed } from "./api";

describe("seed data integrity", () => {
  it("has unique listing and seller ids", () => {
    const ids = listings.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(sellers.map((s) => s.id)).size).toBe(sellers.length);
  });

  it("never mixes negative or zero prices into the market", () => {
    for (const l of listings) {
      expect((l.currentBid ?? l.price)).toBeGreaterThan(0);
      if (l.previousPrice) expect(l.previousPrice).toBeGreaterThan(0);
    }
  });

  it("keeps auctions consistent: bid, count and deadline present", () => {
    for (const l of listings.filter((x) => x.format === "auction")) {
      expect(l.endsAt).toBeTruthy();
      expect(l.bidCount).toBeGreaterThan(0);
      expect(l.endsAt! > new Date().toISOString()).toBe(true);
    }
  });

  it("resolves sellers for every listing", () => {
    for (const l of listings) {
      expect(getSeller(l.sellerId).id).toBe(l.sellerId);
    }
  });

  it("generates at least two price points ending at the asking price", () => {
    for (const l of listings) {
      const h = priceHistory(l);
      expect(h.length).toBeGreaterThanOrEqual(2);
      expect(h[h.length - 1].price).toBe(l.currentBid ?? l.price);
    }
  });

  it("movers carry finite percentages", () => {
    for (const m of movers) {
      expect(Number.isFinite(m.changePct)).toBe(true);
      expect(m.medianPrice).toBeGreaterThan(0);
    }
  });
});

describe("fetchFeed", () => {
  it("filters by format and sorts ending-first", async () => {
    const out = await fetchFeed({ format: "auction", sort: "ending" });
    expect(out.every((l) => l.format === "auction")).toBe(true);
    for (let i = 1; i < out.length; i++) {
      expect(+new Date(out[i - 1].endsAt!)).toBeLessThanOrEqual(+new Date(out[i].endsAt!));
    }
  });

  it("returns the seeded catalog by default", async () => {
    const out = await fetchFeed();
    expect(out.length).toBe(listings.length);
  });

  it("finds a known listing by id", () => {
    expect(getListing("l01")?.player).toContain("Wembanyama");
    expect(getListing("nope")).toBeUndefined();
  });
});

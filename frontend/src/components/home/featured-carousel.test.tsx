import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, stubMatchMedia } from "@/test/render";
import type { Listing } from "@atlas/api";
import { FeaturedCarousel } from "./featured-carousel";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));

beforeAll(stubMatchMedia);
let cleanup = () => {};
afterEach(() => cleanup());

const listing = {
  id: "l1", category: "pokemon", title: "Charizard ex", player: "Charizard ex", set: "151", language: "en", graded: false,
  photos: [], sellerId: "s1", sellerName: "Kolektib & Co.", sellerVerified: true, price: 9800, format: "fixed",
  type: "single_card", status: "active", views: 0, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
} as unknown as Listing;
const show = (ui: React.ReactNode) => {
  const r = render(ui);
  cleanup = r.cleanup;
  return r.container;
};

describe("FeaturedCarousel", () => {
  it("says why a card is featured and who sells it, with their real 30-day sales", () => {
    const c = show(<FeaturedCarousel listings={[listing]} reason="Picked for you · you browse Pokémon most" salesBySeller={{ s1: 18 }} />);
    expect(c.textContent).toContain("Picked for you · you browse Pokémon most");
    expect(c.textContent).toContain("Kolektib & Co.");
    expect(c.textContent).toContain("18 sales in 30 days");
    expect(c.querySelector("[aria-label='Verified seller']")).not.toBeNull();
  });

  it("leaves out the reason and the sales count when they aren't known", () => {
    const c = show(<FeaturedCarousel listings={[listing]} />);
    expect(c.textContent).not.toContain("Picked for you");
    expect(c.textContent).not.toContain("sales in 30 days");
  });
});

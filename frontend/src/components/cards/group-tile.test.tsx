import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, stubMatchMedia } from "@/test/render";
import { CategoriesProvider } from "@/lib/categories-context";
import type { CardGroup, Listing } from "@atlas/api";
import { GroupTile } from "./group-tile";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

beforeAll(stubMatchMedia);

let cleanup = () => {};
afterEach(() => cleanup());

const lead = {
  id: "l1", category: "pokemon", title: "Charizard ex", player: "Charizard ex", set: "151", cardNumber: "199/165",
  language: "en", graded: false, condition: "NM", photos: [], sellerId: "s1", sellerName: "Kolektib & Co.",
  sellerVerified: true, price: 3200, format: "fixed", type: "single_card", status: "active", views: 0,
  createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
} as unknown as Listing;
const group = (sellers: number): CardGroup => ({
  key: "pokemon|charizard ex|151|199/165", lead, sellers, listings: sellers, fromPrice: 3200, conditions: ["NM", "LP"],
});
const show = (g: CardGroup) => {
  const r = render(
    <CategoriesProvider categories={[{ slug: "pokemon", name: "Pokémon", group: "tcg", hue: 95, activeListings: 4 }]}>
      <GroupTile group={g} />
    </CategoriesProvider>,
  );
  cleanup = r.cleanup;
  return r.container;
};

describe("GroupTile", () => {
  it("shows a card from one seller as a normal listing tile", () => {
    const c = show(group(1));
    expect(c.textContent).not.toContain("sellers ·");
    expect(c.querySelector("a")!.getAttribute("href")).toBe("/listing/l1");
    expect(c.querySelector("[aria-label='Verified seller']")).not.toBeNull();
  });

  it("groups several sellers into one tile that opens the compare view", () => {
    const c = show(group(4));
    expect(c.textContent).toContain("4 sellers · from ₱3,200");
    expect(c.querySelector("a")!.getAttribute("href")).toBe(
      `/browse?card=${encodeURIComponent("pokemon|charizard ex|151|199/165")}&sort=price_asc`,
    );
  });
});

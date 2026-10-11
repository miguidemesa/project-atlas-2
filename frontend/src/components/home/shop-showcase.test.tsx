import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, stubMatchMedia } from "@/test/render";
import type { CategoryInfo, TopSeller } from "@atlas/api";
import { ShopShowcase } from "./shop-showcase";
import { YourGames } from "./your-games";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

beforeAll(stubMatchMedia);

let cleanup = () => {};
afterEach(() => cleanup());
const show = (ui: React.ReactNode) => {
  const r = render(ui);
  cleanup = r.cleanup;
  return r.container;
};

const seller = (over: Partial<TopSeller> = {}): TopSeller => ({
  id: "s1", displayName: "Deck & Dice", sales: 12, verified: true, ratingAvg: null, ratingCount: 0, liveListings: 31, listings: [], ...over,
});

describe("ShopShowcase", () => {
  it("is hidden without top sellers", () => {
    expect(show(<ShopShowcase sellers={[]} />).innerHTML).toBe("");
  });

  it("shows only real facts: sales, live count, and a rating only once reviews exist", () => {
    const c = show(<ShopShowcase sellers={[seller()]} />);
    expect(c.textContent).toContain("12 sales, 30 days");
    expect(c.textContent).toContain("31 for sale");
    expect(c.textContent).not.toMatch(/reviews?/);
    expect(c.querySelector("a[href='/sellers/s1']")).not.toBeNull();
  });

  it("adds the rating when the seller has reviews", () => {
    const c = show(<ShopShowcase sellers={[seller({ ratingAvg: 4.9, ratingCount: 38 })]} />);
    expect(c.textContent).toContain("4.9 from 38 reviews");
  });
});

const games: CategoryInfo[] = [
  { slug: "pokemon", name: "Pokémon", group: "tcg", hue: 95, activeListings: 7 },
  { slug: "one_piece", name: "One Piece", group: "tcg", hue: 10, activeListings: 3 },
];

describe("YourGames", () => {
  it("labels the row by whether it follows the visitor, and links every game's hub", () => {
    const yours = show(<YourGames games={games} personalized total={29} />);
    expect(yours.textContent).toContain("Your games");
    expect(yours.querySelector("a[href='/c/pokemon']")!.getAttribute("data-top")).toBe("true");
    expect(yours.querySelector("a[href='/categories']")!.textContent).toBe("All 29 games");
    cleanup();
    const popular = show(<YourGames games={games} personalized={false} total={29} />);
    expect(popular.textContent).toContain("Popular games");
    expect(popular.querySelector("[data-top]")).toBeNull();
  });
});

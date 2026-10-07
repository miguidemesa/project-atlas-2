import { groupCategories } from "./categories";
import type { CategoryInfo } from "./types";

/** The store bar's sections. Under market joins once P3 has median prices. */
export const STORE_LINKS = [
  { href: "/browse", label: "Browse all" },
  { href: "/browse?sort=popular", label: "New and trending" },
  { href: "/browse?format=auction&sort=ending", label: "Ending soon" },
  { href: "/browse?graded=true", label: "Graded slabs" },
  { href: "/browse?type=hobby_box", label: "Sealed" },
] as const;

/** Store pages show the store bar; account, checkout, selling and admin pages show the global bar alone. */
export function isStorePage(pathname: string): boolean {
  return pathname === "/" || pathname === "/browse" || pathname === "/categories" || /^\/(c|listing|sellers)\/[^/]+/.test(pathname);
}

export interface GamesMenuSection {
  label: string;
  items: { slug: string; href: string; count: number | null }[];
}

/** The Games menu: every game under its group, linking to its hub; a count only when something is for sale. */
export function gamesMenuSections(categories: CategoryInfo[]): GamesMenuSection[] {
  return groupCategories(categories).map((g) => ({
    label: g.label,
    items: g.categories.map((c) => ({ slug: c.slug, href: `/c/${c.slug}`, count: c.activeListings > 0 ? c.activeListings : null })),
  }));
}

/** Price brackets for the home rail; each opens browse with the peso range filled in (centavos included). */
export const BUDGETS = [
  { label: "Under ₱1,000", href: "/browse?maxPrice=999.99" },
  { label: "₱1,000–5,000", href: "/browse?minPrice=1000&maxPrice=4999.99" },
  { label: "₱5,000–20,000", href: "/browse?minPrice=5000&maxPrice=19999.99" },
  { label: "₱20,000 and up", href: "/browse?minPrice=20000" },
] as const;

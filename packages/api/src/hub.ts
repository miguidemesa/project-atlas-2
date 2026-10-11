import type { ListingQuery } from "./endpoints";
import type { CategoryInfo } from "./types";

export const HUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "singles", label: "Singles" },
  { id: "graded", label: "Graded" },
  { id: "sealed", label: "Sealed" },
  { id: "sets", label: "Sets" },
] as const;

export type HubTab = (typeof HUB_TABS)[number]["id"];

export function hubTab(value?: string): HubTab {
  return HUB_TABS.find((t) => t.id === value)?.id ?? "overview";
}

/** The game behind /c/<slug>; slugs match exactly, so /c/POKEMON and /c/nba are 404s. */
export function hubGame(categories: CategoryInfo[], slug: string): CategoryInfo | undefined {
  return categories.find((c) => c.slug === slug);
}

/** The feed behind a hub tab, scoped to the game; null for tabs that read the storefront instead. */
export function hubFeedQuery(slug: string, tab: HubTab, language?: string): ListingQuery | null {
  switch (tab) {
    case "singles":
      return { category: slug, type: "single_card", pageSize: 24 };
    case "graded":
      return { category: slug, graded: true, pageSize: 24 };
    case "sealed":
      return { category: slug, type: "hobby_box", pageSize: 24 };
    case "overview":
      return language ? { category: slug, language, pageSize: 12 } : { category: slug, pageSize: 12 };
    case "sets":
      return null;
  }
}

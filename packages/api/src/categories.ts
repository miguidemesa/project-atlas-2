import type { CategoryInfo } from "./types";

export const GROUP_LABELS: Record<CategoryInfo["group"], string> = {
  tcg: "Trading card games",
  sports: "Sports",
  nonsport: "Non-sport",
};

const GROUP_ORDER: CategoryInfo["group"][] = ["tcg", "sports", "nonsport"];

/** Games grouped as the menu and /categories show them: busiest first, then by name. */
export function groupCategories(categories: CategoryInfo[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    categories: categories
      .filter((c) => c.group === group)
      .sort((a, b) => b.activeListings - a.activeListings || a.name.localeCompare(b.name)),
  })).filter((g) => g.categories.length > 0);
}

/** Categories with live listings, busiest first. */
export function busiest(categories: CategoryInfo[], limit: number): CategoryInfo[] {
  return categories
    .filter((c) => c.activeListings > 0)
    .sort((a, b) => b.activeListings - a.activeListings)
    .slice(0, limit);
}

export function categoryName(categories: CategoryInfo[], slug: string | undefined): string | undefined {
  return categories.find((c) => c.slug === slug)?.name;
}

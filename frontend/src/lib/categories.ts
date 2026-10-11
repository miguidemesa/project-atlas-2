import type { CSSProperties } from "react";
import type { GameSkin } from "@atlas/tokens";
import type { CategoryInfo } from "@atlas/api";

export { gameColor, skinFor } from "@atlas/tokens";

/** A game's page skin: the eleven --skin-* roles. Skins theme pages (hubs, game capsules), never the cards themselves. */
export type Skin = GameSkin;

const SKIN_VAR: Record<keyof Skin, string> = {
  ground: "--skin-ground",
  surface: "--skin-surface",
  raised: "--skin-raised",
  control: "--skin-control",
  line: "--skin-line",
  lineStrong: "--skin-line-strong",
  border: "--skin-border",
  accent: "--skin-accent",
  onAccent: "--skin-on-accent",
  text: "--skin-text",
  faint: "--skin-faint",
};

/**
 * A skin as CSS custom properties, set on the element that owns the theme. Children
 * read them with Tailwind arbitrary values, e.g. bg-[color:var(--skin-ground)].
 */
export function skinVars(skin: Skin): CSSProperties {
  return Object.fromEntries(Object.entries(skin).map(([role, value]) => [SKIN_VAR[role as keyof Skin], value])) as CSSProperties;
}

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

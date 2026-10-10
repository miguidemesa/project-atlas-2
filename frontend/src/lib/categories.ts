import type { CSSProperties } from "react";
import type { CategoryInfo } from "@atlas/api";

/** A game's page skin: the eleven --skin-* roles. Skins theme pages (hubs, game capsules), never the cards themselves. */
export interface Skin {
  ground: string;
  surface: string;
  raised: string;
  control: string;
  line: string;
  lineStrong: string;
  border: string;
  accent: string;
  onAccent: string;
  text: string;
  faint: string;
}

/** Hand-tuned skins for the biggest games (Atlas Design System tokens.css). */
const TUNED: Record<string, Skin> = {
  pokemon: {
    ground: "#0a0f1f", surface: "#111a33", raised: "#16213f", control: "#1a2544",
    line: "rgba(174,182,214,0.14)", lineStrong: "rgba(174,182,214,0.28)", border: "rgba(245,205,71,0.24)",
    accent: "#f5cd47", onAccent: "#1b1505", text: "#aeb6d6", faint: "#8c95b8",
  },
  one_piece: {
    ground: "#140908", surface: "#1f0f0d", raised: "#2a1512", control: "#2f1915",
    line: "rgba(216,194,180,0.14)", lineStrong: "rgba(216,194,180,0.28)", border: "rgba(255,122,102,0.28)",
    accent: "#ff7a66", onAccent: "#240805", text: "#d8c2b4", faint: "#a8907f",
  },
  basketball: {
    ground: "#0a1330", surface: "#111c42", raised: "#17244f", control: "#1b2a5a",
    line: "rgba(174,187,217,0.14)", lineStrong: "rgba(174,187,217,0.28)", border: "rgba(143,179,245,0.26)",
    accent: "#8fb3f5", onAccent: "#08122c", text: "#aebbd9", faint: "#8794b8",
  },
  lorcana: {
    ground: "#130a1f", surface: "#1c1030", raised: "#25163f", control: "#2a1a48",
    line: "rgba(201,188,220,0.14)", lineStrong: "rgba(201,188,220,0.28)", border: "rgba(201,167,242,0.26)",
    accent: "#c9a7f2", onAccent: "#1a0d2b", text: "#c9bcdc", faint: "#9a8db0",
  },
};

/** A game's skin: hand-tuned when there is one, otherwise derived from the hue the API sends. */
export function skinFor(slug: string, hue: number): Skin {
  return (
    TUNED[slug] ?? {
      ground: `oklch(0.17 0.03 ${hue})`,
      surface: `oklch(0.21 0.04 ${hue})`,
      raised: `oklch(0.25 0.05 ${hue})`,
      control: `oklch(0.27 0.05 ${hue})`,
      line: `oklch(0.82 0.03 ${hue} / 0.14)`,
      lineStrong: `oklch(0.82 0.03 ${hue} / 0.28)`,
      border: `oklch(0.84 0.12 ${hue} / 0.25)`,
      accent: `oklch(0.84 0.12 ${hue})`,
      onAccent: `oklch(0.2 0.04 ${hue})`,
      text: `oklch(0.82 0.03 ${hue})`,
      faint: `oklch(0.68 0.03 ${hue})`,
    }
  );
}

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

/** The game's colour line: its hub accent, worn as a dot beside its name everywhere. */
export function gameColor(slug: string, hue: number): string {
  return skinFor(slug, hue).accent;
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

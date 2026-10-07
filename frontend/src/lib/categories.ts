import type { CSSProperties } from "react";
import type { CategoryInfo } from "./types";

/** A game's page skin. Skins theme pages (hubs, category tiles), never the cards themselves. */
export interface Skin {
  ground: string;
  surface: string;
  accent: string;
  text: string;
  border: string;
}

/** Hand-tuned skins for the biggest games (palettes from the Holo Night Atlas Design System). */
const TUNED: Record<string, Skin> = {
  pokemon: { ground: "#0a0f1f", surface: "#111a33", accent: "#f5cd47", text: "#aeb6d6", border: "rgba(245,205,71,0.24)" },
  one_piece: { ground: "#140908", surface: "#1f0f0d", accent: "#ff7a66", text: "#d8c2b4", border: "rgba(255,122,102,0.28)" },
  basketball: { ground: "#0a1330", surface: "#111c42", accent: "#8fb3f5", text: "#aebbd9", border: "rgba(143,179,245,0.26)" },
  lorcana: { ground: "#130a1f", surface: "#1c1030", accent: "#c9a7f2", text: "#c9bcdc", border: "rgba(201,167,242,0.26)" },
};

/** A game's skin: hand-tuned when there is one, otherwise derived from the hue the API sends. */
export function skinFor(slug: string, hue: number): Skin {
  return (
    TUNED[slug] ?? {
      ground: `oklch(0.17 0.03 ${hue})`,
      surface: `oklch(0.21 0.04 ${hue})`,
      accent: `oklch(0.84 0.12 ${hue})`,
      text: `oklch(0.82 0.03 ${hue})`,
      border: `oklch(0.84 0.12 ${hue} / 0.25)`,
    }
  );
}

/**
 * A skin as CSS custom properties, set on the element that owns the theme. Children
 * read them with Tailwind arbitrary values, e.g. bg-[color:var(--skin-ground)].
 */
export function skinVars(skin: Skin): CSSProperties {
  return {
    "--skin-ground": skin.ground,
    "--skin-surface": skin.surface,
    "--skin-accent": skin.accent,
    "--skin-text": skin.text,
    "--skin-border": skin.border,
  } as CSSProperties;
}

export const GROUP_LABELS: Record<CategoryInfo["group"], string> = {
  tcg: "Trading card games",
  sports: "Sports",
  nonsport: "Non-sport",
};

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

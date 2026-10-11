import type { CSSProperties } from "react";
import type { GameSkin } from "@atlas/tokens";

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

export { busiest, categoryName, groupCategories, GROUP_LABELS } from "@atlas/api";

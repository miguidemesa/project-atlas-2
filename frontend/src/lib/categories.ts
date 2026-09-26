import type { Category } from "./types";

export interface CategorySkin {
  slug: Category;
  label: string;
  /** Page-level accent only — never applied to a card itself. */
  accent: string;
  bg: string;
  border: string;
  countColor: string;
  bandColors: string[];
}

export const CATEGORY_SKINS: CategorySkin[] = [
  {
    slug: "pokemon",
    label: "Pokémon",
    accent: "#f5cd47",
    bg: "#0a0f1f",
    border: "rgba(245,205,71,0.24)",
    countColor: "#aeb6d6",
    bandColors: ["#e4572e", "#3b8beb", "#3fa34d", "#f2c230", "#9b59b6", "#c0703a", "#3a3f55", "#9aa4b2"],
  },
  {
    slug: "one_piece",
    label: "One Piece",
    accent: "#e9b949",
    bg: "#140908",
    border: "rgba(233,185,73,0.24)",
    countColor: "#d8c2b4",
    bandColors: ["#b3261e", "#b3261e", "#b3261e", "#e9b949"],
  },
  {
    slug: "nba",
    label: "NBA",
    accent: "#8fb3f5",
    bg: "#0a1330",
    border: "rgba(143,179,245,0.26)",
    countColor: "#aebbd9",
    bandColors: ["#1d428a", "#1d428a", "#d1243c"],
  },
  {
    slug: "disney",
    label: "Disney",
    accent: "#c9a7f2",
    bg: "#130a1f",
    border: "rgba(201,167,242,0.26)",
    countColor: "#c9bcdc",
    bandColors: ["#6b3fa0", "#c9a7f2"],
  },
];

export function skinFor(category: Category): CategorySkin {
  return CATEGORY_SKINS.find((c) => c.slug === category) ?? CATEGORY_SKINS[0];
}

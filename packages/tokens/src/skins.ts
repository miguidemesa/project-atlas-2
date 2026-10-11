import { toNativeColor } from "./color";
import { theme } from "./theme";

/** A game's page skin: the eleven roles hubs and capsules wear. Card photos and wells never take a skin. */
export interface GameSkin {
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

/** Skins in tokens.json that belong to a game ("one-piece" is the slug one_piece). Campaign skins such as pokemon-30 are P9's. */
const TUNED = ["pokemon", "one-piece", "basketball", "lorcana", "magic"] as const;
type TunedId = (typeof TUNED)[number];

const isTuned = (id: string): id is TunedId => (TUNED as readonly string[]).includes(id);

/** A game's skin: tuned when tokens.json has one, otherwise derived from the hue the API sends. */
export function skinFor(slug: string, hue: number): GameSkin {
  const id = slug.replace(/_/g, "-");
  if (isTuned(id)) return theme.skins[id];
  const c = (lightness: number, chroma: number, alpha?: number) =>
    toNativeColor(`oklch(${lightness} ${chroma} ${hue}${alpha === undefined ? "" : ` / ${alpha}`})`);
  return {
    ground: c(0.17, 0.03),
    surface: c(0.21, 0.04),
    raised: c(0.25, 0.05),
    control: c(0.27, 0.05),
    line: c(0.82, 0.03, 0.14),
    lineStrong: c(0.82, 0.03, 0.28),
    border: c(0.84, 0.12, 0.25),
    accent: c(0.84, 0.12),
    onAccent: c(0.2, 0.04),
    text: c(0.82, 0.03),
    faint: c(0.68, 0.03),
  };
}

/** A game's colour line: its hub accent, worn as a dot beside its name. */
export const gameColor = (slug: string, hue: number): string => skinFor(slug, hue).accent;

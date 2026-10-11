import { describe, expect, it } from "vitest";
import { contrast } from "./color";
import { gameColor, skinFor } from "./skins";
import { theme } from "./theme";

// every hue the backend's CategoryList sends
const HUES = [95, 35, 330, 25, 285, 60, 230, 15, 250, 210, 300, 350, 200, 270, 190, 220, 160, 45, 140, 120, 150, 240, 10, 0, 100, 40, 20, 260, 310];
const SKINS = [
  ...["pokemon", "one_piece", "basketball", "lorcana", "magic"].map((slug) => [slug, skinFor(slug, 0)] as const),
  ...HUES.map((h) => [`hue ${h}`, skinFor("gundam", h)] as const),
];

describe("skinFor", () => {
  it("uses the tuned skin from tokens.json for the big games, by slug", () => {
    expect(skinFor("pokemon", 0)).toEqual(theme.skins.pokemon);
    expect(skinFor("one_piece", 0)).toEqual(theme.skins["one-piece"]);
  });

  it("derives every other game from its hue, in colours React Native can draw", () => {
    const skin = skinFor("gundam", 210);
    for (const value of Object.values(skin)) expect(value).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,[\d.]+\))$/);
    expect(gameColor("gundam", 210)).toBe(skin.accent);
  });

  it("never hands a campaign skin to a game", () => {
    expect(skinFor("pokemon_30", 95)).not.toEqual(theme.skins["pokemon-30"]);
  });
});

describe.each(SKINS)("%s skin", (_name, skin) => {
  it.each(["accent", "text", "faint"] as const)("%s is 4.5:1 on the ground and the surface", (role) => {
    expect(contrast(skin[role], skin.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(skin[role], skin.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("on-accent text is 4.5:1 on the accent", () => {
    expect(contrast(skin.onAccent, skin.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("Night Navy index-tab text is 4.5:1 on the game colour (spec §8)", () => {
    expect(contrast(theme.color.base, skin.accent)).toBeGreaterThanOrEqual(4.5);
  });
});

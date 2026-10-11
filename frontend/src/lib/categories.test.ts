import { describe, expect, it } from "vitest";
import { toNativeColor } from "@atlas/tokens";
import { gameColor, skinFor, skinVars } from "./categories";

describe("skins", () => {
  it("uses the hand-tuned Pokémon skin from the mockups", () => {
    expect(skinFor("pokemon", 95).accent).toBe("#f5cd47");
  });

  it("derives every other game's skin from its hue", () => {
    const skin = skinFor("gundam", 210);
    expect(skin.ground).toBe(toNativeColor("oklch(0.17 0.03 210)"));
    expect(skin.accent).toBe(toNativeColor("oklch(0.84 0.12 210)"));
  });

  it("exposes a skin as CSS variables", () => {
    expect(skinVars(skinFor("gundam", 210))).toMatchObject({ "--skin-accent": toNativeColor("oklch(0.84 0.12 210)") });
  });
});

describe("eleven skin roles", () => {
  it("sets all eleven skin roles", () => {
    expect(Object.keys(skinVars(skinFor("pokemon", 95))).sort()).toEqual([
      "--skin-accent", "--skin-border", "--skin-control", "--skin-faint", "--skin-ground", "--skin-line",
      "--skin-line-strong", "--skin-on-accent", "--skin-raised", "--skin-surface", "--skin-text",
    ]);
  });

  it("derives an untuned game's skin from its hue", () => {
    const s = skinFor("gundam", 210);
    expect(s.ground).toBe(toNativeColor("oklch(0.17 0.03 210)"));
    expect(s.onAccent).toBe(toNativeColor("oklch(0.2 0.04 210)"));
    expect(s.lineStrong).toBe(toNativeColor("oklch(0.82 0.03 210 / 0.28)"));
  });

  it("uses the tuned One Piece red and Basketball blue for the colour line", () => {
    expect(gameColor("one_piece", 25)).toBe("#ff7a66");
    expect(gameColor("basketball", 45)).toBe("#8fb3f5");
  });
});

import { describe, expect, it } from "vitest";
import { skinFor } from "./categories";

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

/** OKLCH → linear sRGB (Björn Ottosson's matrices), clipped to the sRGB gamut. */
function oklchToLinear(L: number, C: number, h: number): number[] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function luminance(color: string): number {
  const ok = color.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  const hex = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!ok && !hex) throw new Error(`can't read ${color}`);
  const [r, g, b] = ok
    ? oklchToLinear(Number(ok[1]), Number(ok[2]), Number(ok[3]))
    : hex!.slice(1).map((x) => toLinear(parseInt(x, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// every hue the backend's CategoryList sends (spec: derived skins are checked too)
const HUES = [95, 35, 330, 25, 285, 60, 230, 15, 250, 210, 300, 350, 200, 270, 190, 220, 160, 45, 140, 120, 150, 240, 10, 0, 100, 40, 20, 260, 310];
const SKINS = [
  ...["pokemon", "one_piece", "basketball", "lorcana"].map((slug) => [slug, skinFor(slug, 0)] as const),
  ...HUES.map((h) => [`hue ${h}`, skinFor("derived", h)] as const),
];

describe.each(SKINS)("%s skin", (_name, skin) => {
  it.each(["accent", "text", "faint"] as const)("%s is 4.5:1 on the ground and the surface", (role) => {
    expect(contrast(skin[role], skin.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(skin[role], skin.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("on-accent text is 4.5:1 on the accent", () => {
    expect(contrast(skin.onAccent, skin.accent)).toBeGreaterThanOrEqual(4.5);
  });
});

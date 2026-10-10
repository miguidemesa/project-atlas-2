import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildTheme,
  contrast,
  parseColor,
  renderCss,
  renderTheme,
  resolveColor,
  toNativeColor,
  type Tokens,
} from "./render.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const tokens = JSON.parse(read("../tokens.json")) as Tokens;
const THEMES = tokens.color.themes.map((t) => t.id);
const color = (name: string, theme = "atlas") => resolveColor(tokens, name, theme);

describe("colours", () => {
  it("converts oklch to the sRGB hex a browser shows", () => {
    expect(toNativeColor("oklch(0.62796 0.25768 29.2339)")).toBe("#ff0000");
    expect(toNativeColor("oklch(1 0 0)")).toBe("#ffffff");
    expect(toNativeColor("oklch(0.84 0.12 35)")).toBe("#ffae95");
  });

  it("keeps alpha as rgba(), passes hex and rgba() through, and reads rgb() as opaque", () => {
    expect(toNativeColor("oklch(0.82 0.03 35 / 0.14)")).toBe("rgba(215,190,183,0.14)");
    expect(toNativeColor("#0c121e")).toBe("#0c121e");
    expect(toNativeColor("rgba(150,175,225,0.12)")).toBe("rgba(150,175,225,0.12)");
    expect(parseColor("rgb(1,2,3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it("rejects colour formats React Native can't use", () => {
    expect(() => parseColor("color-mix(in srgb, red, blue)")).toThrow('Unsupported colour "color-mix(in srgb, red, blue)"');
  });

  it("follows aliases, and a theme without its own value uses the first theme's", () => {
    expect(color("skin-ground")).toBe("#0c121e");
    expect(color("color-ink", "magic")).toBe("#eef3ff");
    const partial: Tokens = { ...tokens, color: { ...tokens.color, tokens: [{ name: "skin-x", value: { atlas: "#0c121e" } }] } };
    expect(resolveColor(partial, "skin-x", "magic")).toBe("#0c121e");
  });

  it("refuses unknown tokens and alias cycles instead of writing a broken theme", () => {
    expect(() => color("color-nope")).toThrow('Unknown colour token "color-nope"');
    const cyclic: Tokens = {
      ...tokens,
      color: { ...tokens.color, tokens: [{ name: "color-a", value: "{color-b}" }, { name: "color-b", value: "{color-a}" }] },
    };
    expect(() => resolveColor(cyclic, "color-a", "atlas")).toThrow("Alias cycle");
  });
});

// The text pairs DESIGN.md and tokens.json promise, checked at WCAG 2.2 AA for text (4.5:1).
const BASE_PAIRS: [string, string][] = [
  ["color-ink", "color-base"],
  ["color-ink", "color-elevated"],
  ["color-ink", "color-raised"],
  ["color-ink", "color-chrome"],
  ["color-ink-soft", "color-base"],
  ["color-ink-soft", "color-raised"],
  ["color-ink-dim", "color-base"],
  ["color-ink-dim", "color-elevated"],
  ["color-ink-dim", "color-raised"],
  ["color-ink-faint", "color-base"],
  ["color-ink-faint", "color-elevated"],
  ["color-ink-faint", "color-raised"],
  ["color-on-accent", "color-accent"],
  ["color-on-accent", "color-accent-hover"],
  ["color-confirmed", "color-base"],
  ["color-fixed", "color-base"],
  ["color-warn", "color-base"],
  ["color-urgent", "color-base"],
  ["color-graded", "color-base"],
  ["color-map-label", "color-map-land"],
];
const SKIN_PAIRS: [string, string][] = [
  ["skin-accent", "skin-ground"],
  ["skin-text", "skin-ground"],
  ["skin-faint", "skin-ground"],
  ["skin-faint", "skin-surface"],
  ["skin-on-accent", "skin-accent"],
  ["color-ink", "skin-ground"],
];
const SKIN_CASES = THEMES.flatMap((theme) => SKIN_PAIRS.map(([fg, bg]) => [theme, fg, bg] as const));

describe("contrast, WCAG 2.2 AA", () => {
  it.each(BASE_PAIRS)("%s on %s reaches 4.5:1", (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SKIN_CASES)("%s: %s on %s reaches 4.5:1", (theme, fg, bg) => {
    expect(contrast(color(fg, theme), color(bg, theme))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEMES)("%s: skin-text reaches 6:1 on skin-ground", (theme) => {
    expect(contrast(color("skin-text", theme), color("skin-ground", theme))).toBeGreaterThanOrEqual(6);
  });

  it("matches the ratios DESIGN.md quotes", () => {
    expect(contrast(color("color-ink"), color("color-base"))).toBeCloseTo(16.86, 1);
    expect(contrast(color("color-ink-dim"), color("color-base"))).toBeCloseTo(8.11, 1);
    expect(contrast(color("color-on-accent"), color("color-accent"))).toBeCloseTo(11.51, 1);
  });
});

describe("tokens.css", () => {
  const css = renderCss(tokens);

  it("declares colours and shadows on :root and the first theme, with aliases as var()", () => {
    expect(css).toContain(':root, [data-theme="atlas"] {\n  --color-base: #0c121e;');
    expect(css).toContain("  --skin-ground: var(--color-base);");
    expect(css).toContain("  --shadow-lift: 0 22px 44px -20px rgba(2,6,14,0.85);");
  });

  it("re-declares only the skin roles in each further theme", () => {
    expect(css).toContain('[data-theme="magic"] {\n  --skin-ground: oklch(0.17 0.03 35);');
    const pokemon = css.slice(css.indexOf('[data-theme="pokemon"] {'));
    expect(pokemon.slice(0, pokemon.indexOf("}"))).not.toContain("--color-");
  });

  it("puts spacing, radius, the other families and the font stacks on :root, and a class per type style", () => {
    expect(css).toContain("  --space-4: 16px;");
    expect(css).toContain("  --radius-pill: 999px;");
    expect(css).toContain("  --size-tabbar: 72px;");
    expect(css).toContain("  --z-toast: 50;");
    expect(css).toContain('  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;');
    expect(css).toContain(
      ".t-price {\n  font-family: var(--font-display);\n  font-size: 16px;\n  line-height: 22px;\n  font-weight: 600;\n}",
    );
    expect(css).toContain(
      ".t-label {\n  font-family: var(--font-sans);\n  font-size: 11px;\n  line-height: 14px;\n  font-weight: 700;\n  letter-spacing: 0.06em;\n}",
    );
  });
});

describe("theme.ts", () => {
  const theme = buildTheme(tokens);

  it("gives React Native plain colours, converting the oklch skins", () => {
    expect(theme.color.base).toBe("#0c121e");
    expect(theme.color.inkDim).toBe("#9eabc6");
    expect(theme.color.foil1).toBe("#7cf2ff");
    expect(theme.skins.atlas.ground).toBe("#0c121e");
    expect(theme.skins.pokemon.accent).toBe("#f5cd47");
    expect(theme.skins.magic.accent).toBe("#ffae95");
    expect(theme.skins.magic.line).toBe("rgba(215,190,183,0.14)");
  });

  it("turns lengths into numbers and em letter spacing into points", () => {
    expect(theme.space[4]).toBe(16);
    expect(theme.radius.pill).toBe(999);
    expect(theme.size.tabbar).toBe(72);
    expect(theme.type.displayPhone).toEqual({ fontFamily: "Unbounded_700Bold", fontSize: 26, lineHeight: 32, letterSpacing: -0.39 });
    expect(theme.type.body).toEqual({ fontFamily: "Onest_400Regular", fontSize: 15, lineHeight: 22 });
    expect(theme.type.title4.fontFamily).toBe("Onest_600SemiBold");
    expect(theme.duration.press).toBe(160);
    expect(theme.easing.out).toEqual([0.23, 1, 0.32, 1]);
    expect(theme.zIndex.toast).toBe(50);
    expect(theme.shadow.pop).toBe("0 18px 48px -12px rgba(2,6,14,0.75)");
  });

  it("refuses a weight the app has no font file for", () => {
    const heavy: Tokens = {
      ...tokens,
      type: {
        ...tokens.type,
        groups: [{ family: "display", styles: [{ name: "t-x", fontSize: "10px", lineHeight: "12px", fontWeight: 500 }] }],
      },
    };
    expect(() => buildTheme(heavy)).toThrow("No React Native font for display 500 (t-x)");
  });
});

describe("generated files", () => {
  it("match tokens.json (run npm run build -w @atlas/tokens after changing it)", () => {
    expect(read("../tokens.css")).toBe(renderCss(tokens));
    expect(read("../src/theme.ts")).toBe(renderTheme(tokens));
  });
});

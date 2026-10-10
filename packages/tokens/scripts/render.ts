/**
 * Turns tokens.json (the Atlas Design System's export) into tokens.css for the web and theme.ts for
 * React Native. Pure functions: scripts/generate.ts writes the files, and the tests check the same output.
 */

export interface Token<V = string> {
  name: string;
  value: V;
}

interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}

/** The parts of tokens.json the generator reads. */
export interface Tokens {
  color: { themes: { id: string }[]; tokens: Token<string | Record<string, string>>[] };
  type: { families: Record<string, string>; groups: { family: string; styles: TypeStyle[] }[] };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  shadow: { tokens: Token[] };
  size: { tokens: Token[] };
  easing: { tokens: Token[] };
  duration: { tokens: Token[] };
  zIndex: { tokens: Token[] };
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface NativeTextStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

const HEADER =
  "Generated from tokens.json by scripts/generate.ts. Don't edit: change tokens.json, then run npm run build -w @atlas/tokens.";

/** "{color-base}" gives "color-base"; anything else gives null. */
const aliasOf = (value: string): string | null => /^\{([\w-]+)\}$/.exec(value)?.[1] ?? null;

/** A colour's literal value in one theme, following aliases. A theme without its own value uses the first theme's. */
export function resolveColor(tokens: Tokens, name: string, theme: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`Alias cycle: ${[...seen, name].join(", ")}`);
  const token = tokens.color.tokens.find((t) => t.name === name);
  if (!token) throw new Error(`Unknown colour token "${name}"`);
  const value =
    typeof token.value === "string" ? token.value : (token.value[theme] ?? token.value[tokens.color.themes[0].id]);
  const alias = aliasOf(value);
  return alias ? resolveColor(tokens, alias, theme, [...seen, name]) : value;
}

/** A linear sRGB channel (0 to 1) as a gamma-encoded byte, clipped to the sRGB gamut. */
function toByte(linear: number): number {
  const c = Math.min(1, Math.max(0, linear));
  return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
}

/** OKLCH to sRGB with Björn Ottosson's OKLab matrices, the conversion CSS Color 4 specifies. */
function oklchToRgb(lightness: number, chroma: number, hue: number): [number, number, number] {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Reads the colour formats tokens.json uses: #rrggbb, rgb()/rgba() and oklch(l c h [/ alpha]). */
export function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const [r, g, b, a = 1] = rgb[1].split(",").map(Number);
    return { r, g, b, a };
  }
  const lch = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value);
  if (lch) {
    const [r, g, b] = oklchToRgb(Number(lch[1]), Number(lch[2]), Number(lch[3]));
    return { r, g, b, a: lch[4] === undefined ? 1 : Number(lch[4]) };
  }
  throw new Error(`Unsupported colour "${value}"`);
}

const hexOf = ({ r, g, b }: Rgba) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

/** React Native has no oklch(): convert it to hex, or to rgba() when it has alpha. Hex and rgba() pass through. */
export function toNativeColor(value: string): string {
  if (!value.startsWith("oklch(")) return value;
  const rgba = parseColor(value);
  return rgba.a < 1 ? `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})` : hexOf(rgba);
}

const channel = (byte: number) => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG 2.x contrast ratio of two opaque colours. */
export function contrast(foreground: string, background: string): number {
  const a = luminance(parseColor(foreground));
  const b = luminance(parseColor(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const line = (name: string, value: string) => `  --${name}: ${value};`;
const block = (selector: string, lines: string[]) => `${selector} {\n${lines.join("\n")}\n}`;
const cssColor = (value: string) => {
  const alias = aliasOf(value);
  return alias ? `var(--${alias})` : value;
};

/**
 * tokens.css in the design system's layout: colours and shadows on :root and the first theme, a block
 * per further theme with its own values, everything else on :root, and a class per type style.
 */
export function renderCss(tokens: Tokens): string {
  const [first, ...others] = tokens.color.themes.map((t) => t.id);
  const colors = tokens.color.tokens;
  const perTheme = colors.filter((t): t is Token<Record<string, string>> => typeof t.value !== "string");
  const rest = [tokens.spacing, tokens.radius, tokens.size, tokens.easing, tokens.duration, tokens.zIndex];
  const blocks = [
    block(`:root, [data-theme="${first}"]`, [
      ...colors.map((t) => line(t.name, cssColor(typeof t.value === "string" ? t.value : t.value[first]))),
      ...tokens.shadow.tokens.map((t) => line(t.name, t.value)),
    ]),
    ...others.map((theme) =>
      block(
        `[data-theme="${theme}"]`,
        perTheme.filter((t) => theme in t.value).map((t) => line(t.name, cssColor(t.value[theme]))),
      ),
    ),
    block(":root", [
      ...rest.flatMap((family) => family.tokens.map((t) => line(t.name, t.value))),
      ...Object.entries(tokens.type.families).map(([key, stack]) => line(`font-${key}`, stack)),
    ]),
    ...tokens.type.groups.flatMap((group) =>
      group.styles.map((s) =>
        block(`.${s.name}`, [
          `  font-family: var(--font-${group.family});`,
          `  font-size: ${s.fontSize};`,
          `  line-height: ${s.lineHeight};`,
          `  font-weight: ${s.fontWeight};`,
          ...(s.letterSpacing ? [`  letter-spacing: ${s.letterSpacing};`] : []),
        ]),
      ),
    ),
  ];
  return `/* ${HEADER} */\n${blocks.join("\n\n")}\n`;
}

/**
 * React Native loads one font file per weight, named as @expo-google-fonts names them.
 * Onest has no 650 file, so t-title-4 uses SemiBold on phones.
 */
const NATIVE_FONTS: Record<string, Record<number, string>> = {
  display: { 600: "Unbounded_600SemiBold", 700: "Unbounded_700Bold", 800: "Unbounded_800ExtraBold" },
  sans: { 400: "Onest_400Regular", 600: "Onest_600SemiBold", 650: "Onest_600SemiBold", 700: "Onest_700Bold" },
  mono: { 500: "JetBrainsMono_500Medium", 600: "JetBrainsMono_600SemiBold" },
};

/** "color-ink-dim" without the "color-" prefix becomes "inkDim". */
const camel = (name: string, prefix: string) =>
  name.slice(prefix.length).replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
const num = (value: string) => Number.parseFloat(value); // "16px" gives 16, "160ms" gives 160
const bezier = (value: string) => value.slice(value.indexOf("(") + 1, -1).split(",").map(Number);
const named = <T>(list: Token[], prefix: string, convert: (value: string) => T) =>
  Object.fromEntries(list.map((t) => [camel(t.name, prefix), convert(t.value)]));

function nativeType(tokens: Tokens): Record<string, NativeTextStyle> {
  const styles: Record<string, NativeTextStyle> = {};
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      const fontFamily = NATIVE_FONTS[group.family][s.fontWeight];
      if (!fontFamily) throw new Error(`No React Native font for ${group.family} ${s.fontWeight} (${s.name})`);
      const fontSize = num(s.fontSize);
      const letterSpacing = s.letterSpacing ? Math.round(num(s.letterSpacing) * fontSize * 100) / 100 : undefined;
      styles[camel(s.name, "t-")] = {
        fontFamily,
        fontSize,
        lineHeight: num(s.lineHeight),
        ...(letterSpacing === undefined ? {} : { letterSpacing }),
      };
    }
  }
  return styles;
}

/** The typed theme the app reads: colours resolved for React Native, lengths as numbers. */
export function buildTheme(tokens: Tokens) {
  const themes = tokens.color.themes.map((t) => t.id);
  const native = (name: string, theme: string) => toNativeColor(resolveColor(tokens, name, theme));
  const roles = (prefix: string) => tokens.color.tokens.filter((t) => t.name.startsWith(prefix));
  return {
    color: Object.fromEntries(roles("color-").map((t) => [camel(t.name, "color-"), native(t.name, themes[0])])),
    skins: Object.fromEntries(
      themes.map((theme) => [
        theme,
        Object.fromEntries(roles("skin-").map((t) => [camel(t.name, "skin-"), native(t.name, theme)])),
      ]),
    ),
    space: named(tokens.spacing.tokens, "space-", num),
    radius: named(tokens.radius.tokens, "radius-", num),
    size: named(tokens.size.tokens, "size-", num),
    type: nativeType(tokens),
    shadow: named(tokens.shadow.tokens, "shadow-", String),
    duration: named(tokens.duration.tokens, "duration-", num),
    easing: named(tokens.easing.tokens, "easing-", bezier),
    zIndex: named(tokens.zIndex.tokens, "z-", Number),
  };
}

/** theme.ts: the theme as a const object, so every key and value is a type in the app. */
export function renderTheme(tokens: Tokens): string {
  return [
    `// ${HEADER}`,
    "",
    `export const theme = ${JSON.stringify(buildTheme(tokens), null, 2)} as const;`,
    "",
    "export type Theme = typeof theme;",
    'export type SkinId = keyof Theme["skins"];',
    'export type Skin = Theme["skins"][SkinId];',
    "",
  ].join("\n");
}

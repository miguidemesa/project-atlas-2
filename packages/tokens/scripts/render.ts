/**
 * Turns tokens.json (the Atlas Design System's export) into tokens.css for the web and theme.ts for
 * React Native. Pure functions: scripts/generate.ts writes the files, and the tests check the same output.
 */

import { toNativeColor } from "../src/color.ts";

export { contrast, parseColor, toNativeColor, type Rgba } from "../src/color.ts";

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

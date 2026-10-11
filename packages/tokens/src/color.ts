/** Colour reading and conversion shared by the token generator and both apps (React Native has no oklch()). */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
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

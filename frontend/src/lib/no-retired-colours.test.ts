import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((f) => ({ file: path.relative(SRC, f), text: readFileSync(f, "utf8") }));
const Q = `[\\s"'\`]`;

describe("Holo Night colour rules", () => {
  it("no component uses the retired gold token", () => {
    expect(files.filter(({ text }) => /-gold(-dim)?\b/.test(text)).map(({ file }) => file)).toEqual([]);
  });

  it("text on a cyan fill is on-accent ink", () => {
    const fill = new RegExp(`(^|${Q})bg-accent(/\\d+)?(${Q}|$)`);
    const lightText = new RegExp(`(^|${Q})text-(ink|base)(${Q}|$)`);
    const hits = files.flatMap(({ file, text }) =>
      text.split("\n").flatMap((line, i) => (fill.test(line) && lightText.test(line) ? [`${file}:${i + 1}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("no retired emerald or champagne hex values", () => {
    expect(files.filter(({ text }) => /#34d399|#c6a24b|#b08d3e|198,\s*162,\s*75/i.test(text)).map(({ file }) => file)).toEqual([]);
  });
});

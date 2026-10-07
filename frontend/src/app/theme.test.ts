import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "globals.css"), "utf8");
const layout = readFileSync(path.resolve(__dirname, "layout.tsx"), "utf8");

describe("Holo Night theme", () => {
  it.each([
    ["--color-base", "#0c121e"],
    ["--color-elevated", "#121a29"],
    ["--color-raised", "#18233a"],
    ["--color-chrome", "#090e18"],
    ["--color-ink", "#eef3ff"],
    ["--color-accent", "#40e2e7"],
    ["--color-accent-hover", "#7aeef1"],
    ["--color-on-accent", "#04181a"],
  ])("defines %s as %s", (name, value) => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${value};`));
  });

  it("retires the phase 0-3 action colours", () => {
    expect(css).not.toMatch(/--color-gold|#34d399|#c6a24b/i);
  });

  it("sets the eleven atlas skin defaults", () => {
    for (const role of ["ground", "surface", "raised", "control", "line", "line-strong", "border", "accent", "on-accent", "text", "faint"]) {
      expect(css).toContain(`--skin-${role}:`);
    }
  });

  it("maps shadcn's semantic colours onto Holo Night (primary is holo cyan, no light theme)", () => {
    expect(css).toMatch(/--primary:\s*var\(--color-accent\);/);
    expect(css).toMatch(/--primary-foreground:\s*var\(--color-on-accent\);/);
    expect(css).toMatch(/--background:\s*var\(--color-base\);/);
    expect(css).not.toMatch(/oklch\(1 0 0\)/); // shadcn's white light theme
    expect(css).not.toMatch(/--font-sans:\s*var\(--font-sans\)/); // circular font reference from shadcn init
  });

  it("loads Unbounded, Onest and JetBrains Mono with the peso sign's subset, in dark mode", () => {
    expect(layout).toMatch(/Unbounded\(\{[^}]*latin-ext/);
    expect(layout).toMatch(/Onest\(\{[^}]*latin-ext/);
    expect(layout).toContain("JetBrains_Mono(");
    expect(layout).not.toContain("Geist");
    expect(layout).toMatch(/className=\{`dark /);
  });
});

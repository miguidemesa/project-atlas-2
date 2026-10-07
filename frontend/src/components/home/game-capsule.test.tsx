import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { GameCapsule } from "./game-capsule";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

let cleanup = () => {};
afterEach(() => cleanup());

describe("GameCapsule", () => {
  it("opens the game's hub in its own skin with its live count", () => {
    const r = render(<GameCapsule category={{ slug: "pokemon", name: "Pokémon", group: "tcg", hue: 95, activeListings: 7 }} />);
    cleanup = r.cleanup;
    const a = r.container.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("/c/pokemon");
    expect(a.getAttribute("aria-label")).toBe("Pokémon, 7 for sale");
    expect(a.style.getPropertyValue("--skin-accent")).toBe("#f5cd47");
    expect(a.textContent).toContain("7 for sale");
  });

  it("says no listings yet for an empty game, and lets long names wrap", () => {
    const r = render(<GameCapsule category={{ slug: "star_wars_unlimited", name: "Star Wars: Unlimited", group: "tcg", hue: 250, activeListings: 0 }} />);
    cleanup = r.cleanup;
    const a = r.container.querySelector("a")!;
    expect(a.getAttribute("aria-label")).toBe("Star Wars: Unlimited, no listings yet");
    expect(a.className).toContain("min-h-[88px]");
    expect(a.querySelector("[data-name]")!.className).toContain("line-clamp-2");
  });
});

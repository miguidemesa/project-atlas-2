import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { CategoriesProvider } from "@/lib/categories-context";
import { GameLine } from "./game-line";

const categories = [{ slug: "one_piece", name: "One Piece", group: "tcg" as const, hue: 25, activeListings: 3 }];
let cleanup = () => {};
afterEach(() => cleanup());

describe("GameLine", () => {
  it("puts the game's colour dot beside its name", () => {
    const r = render(
      <CategoriesProvider categories={categories}>
        <GameLine slug="one_piece" />
      </CategoriesProvider>,
    );
    cleanup = r.cleanup;
    expect(r.container.textContent).toBe("One Piece");
    const dot = r.container.querySelector<HTMLElement>("[data-game-dot]")!;
    expect(dot.getAttribute("aria-hidden")).toBe("true");
    expect(dot.style.getPropertyValue("--dot")).toBe("#ff7a66");
  });

  it("falls back to the slug and a neutral dot when categories are unavailable", () => {
    const r = render(<GameLine slug="pokemon" />);
    cleanup = r.cleanup;
    expect(r.container.textContent).toBe("pokemon");
    expect(r.container.querySelector<HTMLElement>("[data-game-dot]")!.style.getPropertyValue("--dot")).toBe("var(--color-ink-faint)");
  });
});

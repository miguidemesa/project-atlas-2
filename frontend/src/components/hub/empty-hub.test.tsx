import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { EmptyHub } from "./empty-hub";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

let cleanup = () => {};
afterEach(() => cleanup());

describe("EmptyHub", () => {
  it("invites the first seller instead of showing empty shelves", () => {
    const r = render(<EmptyHub name="Riftbound" />);
    cleanup = r.cleanup;
    expect(r.container.querySelector("h2")!.textContent).toBe("Be the first to sell Riftbound cards");
    expect(r.container.querySelector("a")!.getAttribute("href")).toBe("/sell");
  });
});

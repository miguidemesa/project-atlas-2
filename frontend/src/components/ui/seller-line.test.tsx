import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { SellerLine } from "./seller-line";

let cleanup = () => {};
afterEach(() => cleanup());

describe("SellerLine", () => {
  it("names the seller and marks verified sellers", () => {
    const r = render(<SellerLine name="Kolektib & Co." verified />);
    cleanup = r.cleanup;
    expect(r.container.textContent).toContain("Kolektib & Co.");
    expect(r.container.querySelector("[aria-label='Verified seller']")).not.toBeNull();
  });
  it("shows no mark for an unverified seller", () => {
    const r = render(<SellerLine name="Jun Reyes" verified={false} />);
    cleanup = r.cleanup;
    expect(r.container.querySelector("[aria-label='Verified seller']")).toBeNull();
  });
});

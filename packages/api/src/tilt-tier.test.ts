import { describe, expect, it } from "vitest";
import { FOIL_STRENGTH, tierFor } from "./tilt-tier";

describe("tierFor", () => {
  it("puts graded cards in slabs, even gold ones", () => {
    expect(tierFor({ graded: true, parallel: "Gold", numbered: true })).toBe("slab");
  });

  it("makes gold and numbered cards premium", () => {
    expect(tierFor({ parallel: "Gold Prizm" })).toBe("premium");
    expect(tierFor({ numbered: true })).toBe("premium");
  });

  it("gives silver, holo, ice and crusade parallels foil", () => {
    for (const parallel of ["Silver", "Reverse Holo", "Ice", "Crusade"]) expect(tierFor({ parallel })).toBe("foil");
  });

  it("leaves everything else standard", () => {
    expect(tierFor({})).toBe("standard");
    expect(tierFor({ parallel: null })).toBe("standard");
  });
});

it("keeps the web's foil strengths", () => {
  expect(FOIL_STRENGTH).toEqual({ standard: 0.35, foil: 0.55, premium: 0.7, slab: 0.5 });
});

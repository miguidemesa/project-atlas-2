import { describe, expect, it } from "vitest";
import { cardSubtitle, formatPeso, languageName } from "./format";

describe("format", () => {
  it("formats pesos with thousands separators", () => {
    expect(formatPeso(12500)).toBe("₱12,500");
  });

  it("builds a subtitle from the parts a card actually has", () => {
    expect(cardSubtitle({ year: 2023, set: "Prizm", cardNumber: "136", parallel: "Silver" })).toBe("2023 · Prizm 136 · Silver");
    expect(cardSubtitle({ year: null, set: "151", cardNumber: "199/165", parallel: null })).toBe("151 199/165");
  });

  it("names languages and falls back to the code", () => {
    expect(languageName("ja")).toBe("Japanese");
    expect(languageName("xx")).toBe("xx");
  });
});

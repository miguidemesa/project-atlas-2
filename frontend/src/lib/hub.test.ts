import { describe, expect, it } from "vitest";
import { hubHref } from "./hub";

describe("hub routing", () => {
  it("builds tab links without empty parameters", () => {
    expect(hubHref("pokemon", "overview")).toBe("/c/pokemon");
    expect(hubHref("pokemon", "graded")).toBe("/c/pokemon?tab=graded");
    expect(hubHref("pokemon", "overview", "ja")).toBe("/c/pokemon?lang=ja");
  });
});

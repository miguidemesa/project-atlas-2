import { describe, expect, it } from "vitest";
import { tiltTransform } from "./tilt-math";

describe("tiltTransform", () => {
  it("leans up to 7 degrees toward the pointer, lifted 6px and scaled 1.025", () => {
    expect(tiltTransform(0, 0)).toBe("perspective(900px) rotateX(7.00deg) rotateY(-7.00deg) translateY(-6px) scale(1.025)");
    expect(tiltTransform(1, 1)).toBe("perspective(900px) rotateX(-7.00deg) rotateY(7.00deg) translateY(-6px) scale(1.025)");
  });

  it("is flat at the centre", () => {
    expect(tiltTransform(0.5, 0.5)).toContain("rotateX(0.00deg) rotateY(0.00deg)");
  });

  it("clamps a pointer outside the card", () => {
    expect(tiltTransform(-0.4, 1.6)).toBe(tiltTransform(0, 1));
  });
});

import { describe, expect, it } from "vitest";
import { autoplays, carouselReducer, type CarouselState } from "./carousel";

const s = (over: Partial<CarouselState> = {}): CarouselState => ({ index: 0, count: 5, paused: false, ...over });

describe("carouselReducer", () => {
  it("wraps forwards and backwards", () => {
    expect(carouselReducer(s({ index: 4 }), { type: "next" }).index).toBe(0);
    expect(carouselReducer(s({ index: 0 }), { type: "prev" }).index).toBe(4);
  });

  it("clamps a picked slide and keeps a pause in place", () => {
    expect(carouselReducer(s({ paused: true }), { type: "go", index: 9 })).toEqual(s({ index: 4, paused: true }));
  });

  it("toggles pause", () => {
    expect(carouselReducer(s(), { type: "toggle" }).paused).toBe(true);
  });
});

describe("autoplays", () => {
  it("runs only when unpaused, not held, motion allowed and there is more than one slide", () => {
    expect(autoplays(s(), false, false)).toBe(true);
    expect(autoplays(s({ paused: true }), false, false)).toBe(false);
    expect(autoplays(s(), true, false)).toBe(false); // prefers-reduced-motion
    expect(autoplays(s(), false, true)).toBe(false); // pointer or focus inside
    expect(autoplays(s({ count: 1 }), false, false)).toBe(false);
  });
});

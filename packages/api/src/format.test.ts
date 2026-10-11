import { afterEach, describe, expect, it, vi } from "vitest";
import { cardSubtitle, formatPeso, languageName, timeAgo, timeLeft } from "./format";

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

describe("timeAgo", () => {
  afterEach(() => vi.useRealTimers());

  it("says how long ago in the largest whole unit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));

    expect(timeAgo("2026-10-05T11:59:30Z")).toBe("30s ago");
    expect(timeAgo("2026-10-05T11:55:00Z")).toBe("5m ago");
    expect(timeAgo("2026-10-02T12:00:00Z")).toBe("3d ago");
    expect(timeAgo("2024-10-05T12:00:00Z")).toBe("2y ago");
  });
});

describe("timeLeft", () => {
  const now = Date.UTC(2026, 9, 11, 12);
  it("reads like a countdown and says when it's over", () => {
    expect(timeLeft(new Date(now + (2 * 24 + 4) * 3_600_000).toISOString(), now)).toBe("2d 4h");
    expect(timeLeft(new Date(now + 190 * 60_000).toISOString(), now)).toBe("3h 10m");
    expect(timeLeft(new Date(now + 45 * 60_000).toISOString(), now)).toBe("45m");
    expect(timeLeft(new Date(now - 1).toISOString(), now)).toBe("Ended");
  });
});

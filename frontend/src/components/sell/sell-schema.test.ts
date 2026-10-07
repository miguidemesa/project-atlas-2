import { describe, expect, it } from "vitest";
import { GRADES, sellSchema, toListingPayload, type SellValues } from "./sell-schema";

const base: SellValues = {
  category: "pokemon",
  isSports: false,
  player: "Charizard ex",
  set: "151",
  language: "en",
  type: "single_card",
  graded: false,
  condition: "NM",
  format: "fixed",
  endsInHours: 72,
  price: 9800,
};

const failsOn = (v: unknown, field: string) => {
  const r = sellSchema.safeParse(v);
  return !r.success && r.error.issues.some((i) => i.path[0] === field);
};

describe("sellSchema", () => {
  it("accepts a trading card without team or year", () => {
    expect(sellSchema.safeParse(base).success).toBe(true);
  });

  it("requires team and year for sports cards", () => {
    const result = sellSchema.safeParse({ ...base, category: "basketball", isSports: true });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["team", "year"]));
  });

  it("accepts vintage years back to 1900 up to next year", () => {
    expect(sellSchema.safeParse({ ...base, year: 1986 }).success).toBe(true);
    expect(sellSchema.safeParse({ ...base, year: 1899 }).success).toBe(false);
    expect(sellSchema.safeParse({ ...base, year: new Date().getFullYear() + 1 }).success).toBe(true);
    expect(sellSchema.safeParse({ ...base, year: new Date().getFullYear() + 2 }).success).toBe(false);
  });

  it("needs a condition for raw singles but not for sealed product", () => {
    expect(sellSchema.safeParse({ ...base, condition: undefined }).success).toBe(false);
    expect(sellSchema.safeParse({ ...base, condition: undefined, type: "hobby_box" }).success).toBe(true);
  });

  it("needs company and grade when graded, and only server-known graders", () => {
    expect(failsOn({ ...base, graded: true }, "gradingCompany")).toBe(true);
    expect(failsOn({ ...base, graded: true, gradingCompany: "XYZ", gradeValue: "9" }, "gradingCompany")).toBe(true);
    expect(sellSchema.safeParse({ ...base, graded: true, gradingCompany: "ACE", gradeValue: "10" }).success).toBe(true);
  });

  it("offers only grades the server regex accepts", () => {
    const serverGrade = /^(?:10|[1-9](?:\.5)?)$/;
    expect(GRADES.every((g) => serverGrade.test(g))).toBe(true);
  });

  it("limits auction length to 1-720 hours and requires it for auctions", () => {
    expect(failsOn({ ...base, format: "auction", endsInHours: undefined }, "endsInHours")).toBe(true);
    expect(failsOn({ ...base, format: "auction", endsInHours: 0 }, "endsInHours")).toBe(true);
    expect(failsOn({ ...base, format: "auction", endsInHours: 721 }, "endsInHours")).toBe(true);
    expect(sellSchema.safeParse({ ...base, format: "auction", endsInHours: 720 }).success).toBe(true);
  });

  it("mirrors the server price rules: positive, at most 10,000,000, two decimals", () => {
    expect(failsOn({ ...base, price: 0 }, "price")).toBe(true);
    expect(failsOn({ ...base, price: 10_000_001 }, "price")).toBe(true);
    expect(failsOn({ ...base, price: 10.123 }, "price")).toBe(true);
    expect(failsOn({ ...base, price: NaN }, "price")).toBe(true);
    expect(sellSchema.safeParse({ ...base, price: 99.5 }).success).toBe(true);
  });

  it("caps serial at 50 and card number at 30 characters", () => {
    const sports = { ...base, isSports: true, team: "Bulls", year: 1986 };
    expect(failsOn({ ...sports, serialNumber: "x".repeat(51) }, "serialNumber")).toBe(true);
    expect(sellSchema.safeParse({ ...sports, serialNumber: "x".repeat(50) }).success).toBe(true);
    expect(failsOn({ ...base, cardNumber: "x".repeat(31) }, "cardNumber")).toBe(true);
  });
});

describe("sellSchema edge cases", () => {
  const sports = { ...base, category: "basketball", isSports: true, team: "Bulls", year: 1986 };

  it("accepts a complete sports card, and needs team and year each on their own", () => {
    expect(sellSchema.safeParse(sports).success).toBe(true);
    expect(failsOn({ ...sports, team: undefined }, "team")).toBe(true);
    expect(failsOn({ ...sports, year: undefined }, "year")).toBe(true);
  });

  it("ignores a stale long team or serial after switching from sports to a TCG", () => {
    const stale = { ...base, isSports: false, team: "x".repeat(300), serialNumber: "y".repeat(80) };
    expect(sellSchema.safeParse(stale).success).toBe(true);
  });

  it("caps player, set and team at 200 characters with a friendly message", () => {
    const long = "x".repeat(201);
    for (const field of ["player", "set"]) {
      const r = sellSchema.safeParse({ ...base, [field]: long });
      expect(r.success).toBe(false);
      expect(r.error!.issues[0].message).toBe("200 characters at most");
    }
    expect(failsOn({ ...sports, team: long }, "team")).toBe(true);
    expect(sellSchema.safeParse({ ...base, player: "x".repeat(200) }).success).toBe(true);
  });

  it("rejects a whitespace-only player", () => {
    expect(failsOn({ ...base, player: "   " }, "player")).toBe(true);
  });

  it("accepts the boundaries: year 1900, price 10,000,000, description 2000", () => {
    expect(sellSchema.safeParse({ ...base, year: 1900, price: 10_000_000, description: "x".repeat(2000) }).success).toBe(true);
    expect(failsOn({ ...base, description: "x".repeat(2001) }, "description")).toBe(true);
  });

  it("rejects fractional auction hours and grades the server would refuse", () => {
    expect(failsOn({ ...base, format: "auction", endsInHours: 1.5 }, "endsInHours")).toBe(true);
    expect(failsOn({ ...base, graded: true, gradingCompany: "PSA", gradeValue: "9.25" }, "gradeValue")).toBe(true);
    expect(failsOn({ ...base, graded: true, gradingCompany: "PSA", gradeValue: "11" }, "gradeValue")).toBe(true);
  });
});

describe("toListingPayload", () => {
  it("drops stale grade fields after unticking graded", () => {
    const p = toListingPayload({ ...base, graded: false, gradingCompany: "PSA", gradeValue: "9" });
    expect(p.gradingCompany).toBeUndefined();
    expect(p.gradeValue).toBeUndefined();
  });

  it("drops stale team and serial after switching to a TCG", () => {
    const p = toListingPayload({ ...base, team: "Bulls", serialNumber: "1/10" });
    expect(p.team).toBeUndefined();
    expect(p.serialNumber).toBeUndefined();
  });

  it("sends team, year and serial for sports", () => {
    expect(toListingPayload({ ...base, isSports: true, team: "Bulls", year: 1986, serialNumber: "1/10" })).toMatchObject({
      team: "Bulls",
      year: 1986,
      serialNumber: "1/10",
    });
  });

  it("sends the condition and drops the team for trading card games", () => {
    const payload = toListingPayload({ ...base, team: "ignored" });
    expect(payload.condition).toBe("NM");
    expect(payload.team).toBeUndefined();
  });

  it("sends grade fields only for graded cards", () => {
    const payload = toListingPayload({ ...base, graded: true, gradingCompany: "CGC", gradeValue: "9.5" });
    expect(payload).toMatchObject({ gradingCompany: "CGC", gradeValue: "9.5", condition: undefined });
    expect(toListingPayload(base).gradeValue).toBeUndefined();
  });

  it("sends a condition only for raw single cards", () => {
    expect(toListingPayload({ ...base, type: "hobby_box" }).condition).toBeUndefined();
  });

  it("sends an auction length only for auctions", () => {
    expect(toListingPayload(base).endsInHours).toBeUndefined();
    expect(toListingPayload({ ...base, format: "auction" }).endsInHours).toBe(72);
  });

  it("sends the serial number only for sports cards", () => {
    const sports = { ...base, isSports: true, team: "Bulls", year: 1986, serialNumber: "12/99" };
    expect(toListingPayload(sports).serialNumber).toBe("12/99");
    expect(toListingPayload({ ...base, serialNumber: "12/99" }).serialNumber).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { feedQuery, nextPage } from "./api";

describe("feedQuery", () => {
  it("sends only the filters that are set", () => {
    expect(feedQuery({})).toBe("/listings?page=1&pageSize=24");
    expect(feedQuery({ category: "pokemon", graded: true, minPrice: 500, sort: "ending" })).toBe(
      "/listings?page=1&pageSize=24&category=pokemon&sort=ending&graded=true&minPrice=500",
    );
  });

  it("encodes free text", () => {
    expect(feedQuery({ q: "100% pikachu" })).toBe("/listings?page=1&pageSize=24&q=100%25+pikachu");
  });
});

describe("nextPage", () => {
  it("asks for another page only while results remain", () => {
    expect(nextPage({ items: [], total: 50, page: 1, pageSize: 24 })).toBe(2);
    expect(nextPage({ items: [], total: 48, page: 2, pageSize: 24 })).toBeUndefined();
  });
});

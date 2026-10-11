import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("keeps the web's feed key and gives home and each hub their own storefront key", () => {
    expect(queryKeys.feed({ category: "pokemon" })).toEqual(["feed", { category: "pokemon" }]);
    expect(queryKeys.storefront()).toEqual(["storefront", "home"]);
    expect(queryKeys.storefront("one_piece")).toEqual(["storefront", "one_piece"]);
    expect(queryKeys.notificationPreferences()).toEqual(["me", "notification-preferences"]);
    expect(queryKeys.appConfig()).toEqual(["app-config"]);
  });

  it("keys the P2 reads", () => {
    expect(queryKeys.categories()).toEqual(["categories"]);
    expect(queryKeys.listing("l1")).toEqual(["listing", "l1"]);
    expect(queryKeys.seller("s1")).toEqual(["seller", "s1"]);
    expect(queryKeys.cardGroups()).toEqual(["card-groups", "all"]);
    expect(queryKeys.cardGroups("pokemon")).toEqual(["card-groups", "pokemon"]);
  });
});

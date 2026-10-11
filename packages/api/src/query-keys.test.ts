import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("keeps the web's feed key and gives home and each hub their own storefront key", () => {
    expect(queryKeys.feed({ category: "pokemon" })).toEqual(["feed", { category: "pokemon" }]);
    expect(queryKeys.storefront()).toEqual(["storefront", "home"]);
    expect(queryKeys.storefront("one_piece")).toEqual(["storefront", "one_piece"]);
    expect(queryKeys.notificationPreferences()).toEqual(["me", "notification-preferences"]);
  });
});

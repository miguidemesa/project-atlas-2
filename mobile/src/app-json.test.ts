import { theme } from "@atlas/tokens";
import appJson from "../app.json";

it("names the app Atlas with the ph.atlas.app ids and the atlas:// scheme", () => {
  expect(appJson.expo).toMatchObject({ name: "Atlas", slug: "atlas", scheme: "atlas", userInterfaceStyle: "dark" });
  expect(appJson.expo.ios.bundleIdentifier).toBe("ph.atlas.app");
  expect(appJson.expo.android.package).toBe("ph.atlas.app");
});

it("uses only Atlas token colours", () => {
  const tokens = new Set<string>(Object.values(theme.color));
  const hexes = JSON.stringify(appJson).match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  expect(hexes.length).toBeGreaterThan(0);
  expect(hexes.filter((hex) => !tokens.has(hex.toLowerCase()))).toEqual([]);
});

import { theme } from "@atlas/tokens";
import { FONTS } from "./fonts";

it("loads every font file the theme's text styles name", () => {
  const families = new Set(Object.values(theme.type).map((style) => style.fontFamily));
  expect([...families].filter((family) => !(family in FONTS))).toEqual([]);
});

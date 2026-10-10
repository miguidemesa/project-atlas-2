import { Text as NativeText, type TextProps } from "react-native";

/** Dynamic Type grows text up to this factor, the cap that keeps phone layouts intact. */
export const MAX_FONT_SCALE = 1.5;

/** All app text goes through this, so the Dynamic Type cap applies everywhere. */
export function Text(props: TextProps) {
  return <NativeText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}

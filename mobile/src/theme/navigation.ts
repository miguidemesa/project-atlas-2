import { theme } from "@atlas/tokens";
import { DarkTheme } from "expo-router";

// Kept apart from ThemeProvider so screens that only need tokens don't load the router.
/** React Navigation's colours, so nothing flashes white between screens. */
export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.color.accent,
    background: theme.color.base,
    card: theme.color.chrome,
    text: theme.color.ink,
    border: theme.color.line,
    notification: theme.color.accent,
  },
};

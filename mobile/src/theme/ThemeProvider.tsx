import { createContext, useContext, useMemo, type ReactNode } from "react";
import { theme, type SkinId } from "@atlas/tokens";

const SkinContext = createContext<SkinId>("atlas");

/** Hands the design tokens to every screen. A game hub (P2) wraps its subtree in its own skin. */
export function ThemeProvider({ skin = "atlas", children }: { skin?: SkinId; children: ReactNode }) {
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}

/** The tokens plus the current skin's eleven roles. */
export function useTheme() {
  const skin = useContext(SkinContext);
  return useMemo(() => ({ ...theme, skin: theme.skins[skin] }), [skin]);
}

/** Native stack headers and screen backgrounds in the night palette. */
export function useHeaderOptions() {
  const { color, type } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: color.chrome },
      headerTintColor: color.ink,
      headerTitleStyle: { fontFamily: type.title4.fontFamily, color: color.ink },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: color.base },
    }),
    [color, type],
  );
}

import { renderHook } from "@testing-library/react-native";
import { theme } from "@atlas/tokens";
import type { ReactNode } from "react";
import { ThemeProvider, useHeaderOptions, useTheme } from "./ThemeProvider";

it("uses the Atlas skin unless a hub picks another", async () => {
  const plain = await renderHook(() => useTheme());
  expect(plain.result.current.skin).toEqual(theme.skins.atlas);

  const hub = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => <ThemeProvider skin="pokemon">{children}</ThemeProvider>,
  });
  expect(hub.result.current.skin.accent).toBe(theme.skins.pokemon.accent);
});

it("styles stack headers from the tokens", async () => {
  const { result } = await renderHook(() => useHeaderOptions());
  expect(result.current.headerStyle.backgroundColor).toBe(theme.color.chrome);
  expect(result.current.contentStyle.backgroundColor).toBe(theme.color.base);
});

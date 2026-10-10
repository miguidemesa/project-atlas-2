import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createQueryClient } from "@/api/query-client";
import { SessionProvider } from "@/session/SessionProvider";
import { FONTS } from "@/theme/fonts";
import { navigationTheme } from "@/theme/navigation";
import { ThemeProvider, useHeaderOptions, useTheme } from "@/theme/ThemeProvider";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationThemeProvider value={navigationTheme}>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <StatusBar style="light" />
              <AppFrame />
            </SessionProvider>
          </QueryClientProvider>
        </NavigationThemeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppFrame() {
  const { color } = useTheme();
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.base } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" options={{ ...header, presentation: "modal", headerShown: true, title: "Sign in" }} />
      <Stack.Screen name="register" options={{ ...header, presentation: "modal", headerShown: true, title: "Create an account" }} />
    </Stack>
  );
}

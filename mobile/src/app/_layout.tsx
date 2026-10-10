import { useFonts } from "expo-font";
import { Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FONTS } from "@/theme/fonts";
import { ThemeProvider, navigationTheme, useTheme } from "@/theme/ThemeProvider";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <AppFrame />
        </NavigationThemeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppFrame() {
  const { color } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.base } }} />;
}

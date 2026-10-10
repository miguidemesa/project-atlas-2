import { Stack } from "expo-router";
import { useHeaderOptions } from "@/theme/ThemeProvider";

/** Each tab's own stack: its first screen draws its own title; pushed screens get a themed header with a back button. */
export function TabStack({ titles = {} }: { titles?: Record<string, string> }) {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {Object.entries(titles).map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </Stack>
  );
}

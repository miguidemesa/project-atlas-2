import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsOnline } from "@/net/online";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/** A slim bar at the top while the phone is offline. Screens keep showing what was saved. */
export function OfflineBar() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  const { color, space, type } = useTheme();
  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        paddingTop: insets.top + space[2],
        paddingBottom: space[2],
        paddingHorizontal: space[4],
        backgroundColor: color.elevated,
        borderBottomWidth: 1,
        borderBottomColor: color.warnLine,
      }}
    >
      <Text style={[type.small, { color: color.warn }]}>You're offline. Showing saved results.</Text>
    </View>
  );
}

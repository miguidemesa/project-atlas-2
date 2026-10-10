import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/** A tab's root screen: the top safe area, the page ground and an optional title. */
export function Screen({ title, children }: { title?: string; children?: ReactNode }) {
  const { color, space, type } = useTheme();
  return (
    <SafeAreaView edges={["top"]} style={[styles.fill, { backgroundColor: color.base }]}>
      {title ? (
        <Text
          accessibilityRole="header"
          style={[type.displayPhone, { color: color.ink, paddingHorizontal: space[4], paddingVertical: space[3] }]}
        >
          {title}
        </Text>
      ) : null}
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

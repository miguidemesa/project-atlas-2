import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/** A centred message for an empty, failed or not-yet-built screen. Never stand-in content. */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const { color, space, type } = useTheme();
  return (
    <View style={[styles.centre, { padding: space[6], gap: space[3] }]}>
      <Text style={[type.title3, styles.text, { color: color.ink }]}>{title}</Text>
      {body ? <Text style={[type.body, styles.text, { color: color.inkDim }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { textAlign: "center" },
});

import { Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

const CHEVRON_SIZE = 20;

/** A full-width row that opens another screen. */
export function LinkRow({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const { color, size, space, type } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: size.controlLg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: space[4],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.line,
      }}
    >
      <Text style={[type.body, { color: color.ink }]}>{label}</Text>
      <ChevronRight size={CHEVRON_SIZE} strokeWidth={1.75} color={color.inkFaint} />
    </Pressable>
  );
}

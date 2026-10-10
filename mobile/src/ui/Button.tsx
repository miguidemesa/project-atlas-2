import { ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

const DISABLED_OPACITY = 0.45; // DESIGN.md: disabled controls sit at 45% and keep their labels

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}

/** A pill button: holo cyan for a screen's one primary action, ghost and danger otherwise. 48pt tall on phones. */
export function Button({ label, onPress, variant = "primary", disabled = false, busy = false, testID }: Props) {
  const { color, radius, size, space, type } = useTheme();
  const primary = variant === "primary";
  const inactive = disabled || busy;
  const ink = primary ? color.onAccent : variant === "danger" ? color.urgent : color.ink;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={{
        minHeight: size.controlLg,
        borderRadius: radius.pill,
        paddingHorizontal: space[5],
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? color.accent : "transparent",
        borderWidth: primary ? 0 : 1,
        borderColor: variant === "danger" ? color.urgentLine : color.lineHv,
        opacity: inactive ? DISABLED_OPACITY : 1,
      }}
    >
      {busy ? <ActivityIndicator color={ink} /> : <Text style={[type.bodyStrong, { color: ink }]}>{label}</Text>}
    </PressableScale>
  );
}

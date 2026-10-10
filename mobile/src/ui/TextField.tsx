import { TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { MAX_FONT_SCALE, Text } from "./Text";

const INPUT_FONT_SIZE = 16; // DESIGN.md: phone inputs use 16px text

interface Props extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string;
}

/** A labelled input: the label is also its accessibility label, and an error shows underneath. */
export function TextField({ label, error, ...input }: Props) {
  const { color, radius, size, space, type } = useTheme();
  return (
    <View style={{ gap: space[1] }}>
      <Text style={[type.bodyStrong, { color: color.ink }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.inkFaint}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={{
          fontFamily: type.body.fontFamily,
          fontSize: INPUT_FONT_SIZE,
          minHeight: size.controlLg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? color.urgentLine : color.lineHv,
          backgroundColor: color.elevated,
          color: color.ink,
          paddingHorizontal: space[3],
        }}
        {...input}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[type.small, { color: color.urgent }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

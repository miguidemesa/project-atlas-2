import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { durations, easeOut } from "@/motion/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.97; // DESIGN.md: a press scales to 0.97 over 160ms

type Props = Omit<PressableProps, "style" | "children"> & { style?: StyleProp<ViewStyle>; children?: ReactNode };

/** Anything pressable that should feel heard (spec section 8 baseline): in to 0.97, back out the same way. */
export function PressableScale({ style, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const to = (value: number) => withTiming(value, { duration: durations.press, easing: easeOut });

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        scale.set(to(PRESSED_SCALE));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(to(1));
        onPressOut?.(event);
      }}
      style={[style, pressStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

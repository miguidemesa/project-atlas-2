import { FOIL_STRENGTH, type TiltTier } from "@atlas/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { durations, springs } from "@/motion/motion";
import { useReduceMotion } from "@/motion/useReduceMotion";
import { useTheme } from "@/theme/ThemeProvider";
import { tiltFor } from "./tilt";

export const CARD_RATIO = 88 / 63;
const PERSPECTIVE = 800;
const HELD_GROWTH = 0.02; // 1.02 while held
const FOIL_SPAN = 2.4; // the foil gradient is 240% of the card, as on the web, so it can slide across
const PHOTO_FADE_MS = 150;
const SHEEN_ALPHA = "14"; // 8%: a faint neutral highlight, never foil colours
/** A token colour at zero alpha, so a gradient fades out without a grey fringe. */
const clear = (hex: string) => `${hex}00`;

interface Props {
  uri: string | null;
  tier: TiltTier;
  width: number;
  label: string;
  /** "free": a drag tilts it at once (the lift peek). "none": still (shelf rows). P2 adds "hold" for the listing photo. */
  tilt?: "free" | "none";
}

/** A card photo in its sleeve (spec section 8). The photo is exactly what the seller uploaded: contain-fit, no filter. */
export function CardPhoto({ uri, tier, width, label, tilt = "none" }: Props) {
  const { color, radius, shadow } = useTheme();
  const reduceMotion = useReduceMotion();
  const height = width * CARD_RATIO;
  const canTilt = tilt === "free" && !reduceMotion;
  const strength = FOIL_STRENGTH[tier];

  const px = useSharedValue(0.5);
  const py = useSharedValue(0.5);
  const held = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(canTilt)
    .minDistance(0)
    .onBegin((e) => {
      px.set(e.x / width);
      py.set(e.y / height);
      held.set(withTiming(1, { duration: durations.foilIn }));
    })
    .onUpdate((e) => {
      px.set(e.x / width);
      py.set(e.y / height);
    })
    .onFinalize(() => {
      px.set(withSpring(0.5, springs.settle));
      py.set(withSpring(0.5, springs.settle));
      held.set(withTiming(0, { duration: durations.foilOut }));
    });

  const cardStyle = useAnimatedStyle(() => {
    const t = tiltFor(px.get(), py.get());
    return {
      transform: [
        { perspective: PERSPECTIVE },
        { rotateX: `${t.rotateX}deg` },
        { rotateY: `${t.rotateY}deg` },
        { scale: 1 + HELD_GROWTH * held.get() },
      ],
    };
  });

  // The light slides against the tilt, the way a background-position sweep does on the web.
  const foilStyle = useAnimatedStyle(() => {
    const t = tiltFor(px.get(), py.get());
    return {
      opacity: held.get() * strength,
      transform: [{ translateX: -t.foilX * width * (FOIL_SPAN - 1) }, { translateY: -t.foilY * height * (FOIL_SPAN - 1) }],
    };
  });

  const sleeve = (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={uri ? label : `${label}, no photo`}
      style={[
        { width, height, borderRadius: radius.card, borderWidth: 1, borderColor: color.wellLine, backgroundColor: color.well, overflow: "hidden" },
        canTilt && { boxShadow: shadow.lift },
        cardStyle,
      ]}
    >
      {uri ? (
        <Image
          testID="card-photo-image"
          source={{ uri }}
          contentFit="contain"
          transition={PHOTO_FADE_MS}
          style={StyleSheet.absoluteFill}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <LinearGradient
        pointerEvents="none"
        colors={[`${color.ink}${SHEEN_ALPHA}`, clear(color.ink)]}
        locations={[0, 0.45]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {canTilt ? (
        <Animated.View
          testID="card-foil"
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: (-(FOIL_SPAN - 1) / 2) * width,
              top: (-(FOIL_SPAN - 1) / 2) * height,
              width: width * FOIL_SPAN,
              height: height * FOIL_SPAN,
              mixBlendMode: "screen",
            },
            foilStyle,
          ]}
        >
          <LinearGradient
            colors={[clear(color.foil1), color.foil1, color.foil2, color.foil3, color.foil4, clear(color.foil4)]}
            locations={[0.2, 0.36, 0.46, 0.56, 0.66, 0.8]}
            start={{ x: 0, y: 0.1 }}
            end={{ x: 1, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );

  return canTilt ? <GestureDetector gesture={pan}>{sleeve}</GestureDetector> : sleeve;
}

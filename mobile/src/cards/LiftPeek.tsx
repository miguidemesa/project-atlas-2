import { formatPeso, tierFor, type Listing } from "@atlas/api";
import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/motion/haptics";
import { durations, easeOut, springs } from "@/motion/motion";
import { useReduceMotion } from "@/motion/useReduceMotion";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { CARD_RATIO, CardPhoto } from "./CardPhoto";
import { listingPhoto } from "./photo-uri";
import { shareListing } from "./share";

export interface Origin {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A card held up in the peek, and where its sleeve sits on screen (null when unknown: it fades in instead). */
export interface Lifted {
  listing: Listing;
  origin: Origin | null;
}

/** Spec section 8: a 450ms hold lifts a card. */
export const LONG_PRESS_MS = 450;
const PEEK_WIDTH_SHARE = 0.62;
const PEEK_MAX_WIDTH = 280;
const PANEL_HEIGHT = 136;
const LIFT_BUMP = 1.06;
const LIFT_RISE = 8;
const LIFT_STAGE = 0.12; // the first stretch of the flight: the card rises out of its sleeve
const FLICK_VELOCITY = 400; // pt/s: a quick flick down closes the peek, however short
const FLICK_DISTANCE = 48;

/** What the listing costs right now: the current bid on an auction, otherwise the price. */
export function shownPrice(listing: Listing): number {
  return listing.format === "auction" ? (listing.currentBid ?? listing.price) : listing.price;
}

/** The long-press lift (spec section 8): the card flies from its sleeve to the middle, over a scrim, with its actions. */
export function LiftPeek({ lifted, onClose }: { lifted: Lifted | null; onClose: () => void }) {
  return lifted ? <Peek key={lifted.listing.id} lifted={lifted} onClose={onClose} /> : null;
}

function Peek({ lifted: { listing, origin }, onClose }: { lifted: Lifted; onClose: () => void }) {
  const { color, radius, space, type } = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const flies = origin !== null && !reduceMotion;

  const cardWidth = Math.min(screen.width * PEEK_WIDTH_SHARE, PEEK_MAX_WIDTH);
  const cardHeight = cardWidth * CARD_RATIO;
  const left = (screen.width - cardWidth) / 2;
  const top = Math.max(insets.top + space[4], (screen.height - cardHeight - PANEL_HEIGHT) / 2);
  const from = origin ?? { x: left, y: top, width: cardWidth, height: cardHeight };
  const dx = from.x + from.width / 2 - (left + cardWidth / 2);
  const dy = from.y + from.height / 2 - (top + cardHeight / 2);
  const startScale = from.width / cardWidth;

  const flight = useSharedValue(flies ? 0 : 1);
  const shown = useSharedValue(0);

  // Once, when the card is lifted.
  useEffect(() => {
    haptics.tick();
    shown.set(withTiming(1, { duration: durations.scrim, easing: easeOut }));
    if (flies) {
      flight.set(withSequence(withTiming(LIFT_STAGE, { duration: durations.liftOut, easing: easeOut }), withSpring(1, springs.lift)));
    }
  }, []);

  function close() {
    shown.set(withTiming(0, { duration: durations.drop, easing: easeOut }));
    if (flies) flight.set(withTiming(0, { duration: durations.drop, easing: easeOut }));
    setTimeout(onClose, durations.drop);
  }

  const flick = Gesture.Pan()
    .runOnJS(true)
    .withTestId("lift-flick")
    .onEnd((e) => {
      if (e.velocityY > FLICK_VELOCITY || e.translationY > FLICK_DISTANCE) close();
    });

  const cardStyle = useAnimatedStyle(() => {
    const p = flight.get();
    return {
      opacity: flies ? 1 : shown.get(),
      transform: [
        { translateX: interpolate(p, [0, LIFT_STAGE, 1], [dx, dx, 0]) },
        { translateY: interpolate(p, [0, LIFT_STAGE, 1], [dy, dy - LIFT_RISE, 0]) },
        { scale: interpolate(p, [0, LIFT_STAGE, 1], [startScale, startScale * LIFT_BUMP, 1]) },
      ],
    };
  });
  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: reduceMotion ? 0 : (1 - shown.get()) * space[6] }],
  }));

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }, scrimStyle]}>
          <Pressable testID="lift-scrim" accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.fill} />
        </Animated.View>
        <Animated.View testID="lift-peek" style={[{ position: "absolute", left, top }, cardStyle]}>
          <CardPhoto uri={listingPhoto(listing.imageUrl)} tier={tierFor(listing)} width={cardWidth} label={listing.title} tilt="free" />
        </Animated.View>
        <GestureDetector gesture={flick}>
          <Animated.View
            style={[
              {
                position: "absolute",
                left,
                width: cardWidth,
                top: top + cardHeight + space[4],
                alignItems: "center",
                gap: space[2],
                padding: space[4],
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.elevated, // the panel is a surface, so the dimmed rows never show through its text
              },
              panelStyle,
            ]}
          >
            <Text numberOfLines={2} style={[type.bodyStrong, styles.center, { color: color.ink }]}>
              {listing.title}
            </Text>
            <Text style={[type.price, styles.tabular, { color: color.ink }]}>{formatPeso(shownPrice(listing))}</Text>
            <Button testID="lift-share" label="Share" variant="ghost" onPress={() => void shareListing(listing)} />
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: "center" },
  tabular: { fontVariant: ["tabular-nums"] },
});

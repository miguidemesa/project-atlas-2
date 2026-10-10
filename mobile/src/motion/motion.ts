import { theme } from "@atlas/tokens";
import { Easing } from "react-native-reanimated";

/** Spec section 8: springs drive whatever a finger moves (interruptible, they keep velocity); timings drive the rest. */
export const springs = {
  /** A tilted card settling flat after the thumb lifts. */
  settle: { duration: 450, dampingRatio: 0.75 },
  /** A card flying from its sleeve to the lift peek. */
  lift: { duration: 420, dampingRatio: 0.82 },
} as const;

/** Milliseconds. UI motion stays under 300ms, and exits run faster than entries. */
export const durations = {
  press: theme.duration.press, // 160
  foilIn: 120,
  foilOut: 200,
  scrim: 200,
  drop: 180,
  liftOut: 120,
} as const;

const [x1, y1, x2, y2] = theme.easing.out;
/** The token ease-out, cubic-bezier(0.23, 1, 0.32, 1). */
export const easeOut = Easing.bezier(x1, y1, x2, y2);

import type { View } from "react-native";
import type { Origin } from "./LiftPeek";

/** Where a card's sleeve sits on screen, for the lift's flight. Null when it can't be measured: the peek then fades in. */
export function measureOrigin(view: View | null, done: (origin: Origin | null) => void): void {
  if (!view) return done(null);
  view.measureInWindow((x, y, width, height) => done(width > 0 ? { x, y, width, height } : null));
}

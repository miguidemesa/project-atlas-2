import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

// Read at launch and kept live, so a screen knows the setting on its very first frame (a lift must
// not start flying and then switch to the fade).
let reduceMotion = false;
const listeners = new Set<() => void>();

function update(on: boolean) {
  reduceMotion = on;
  for (const listener of listeners) listener();
}

/** Reads the setting now and follows its changes. Runs once at import; exported for tests. */
export function watchReduceMotion(): () => void {
  // If the setting can't be read, motion stays on: the system default.
  void AccessibilityInfo.isReduceMotionEnabled().then(update, () => undefined);
  const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
  return () => subscription.remove();
}
watchReduceMotion();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Spec section 8: Reduce Motion means less motion, not none. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduceMotion);
}

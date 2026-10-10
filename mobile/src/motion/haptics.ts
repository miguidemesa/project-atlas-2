import * as Haptics from "expo-haptics";

// A haptic is a courtesy on top of a visible change; a phone without a haptic engine just stays quiet.
const quietly = (feedback: Promise<void>) => void feedback.catch(() => undefined);

/** The app's three haptics (spec section 8). Each pairs with a visible word or state, never alone. */
export const haptics = {
  tick: () => quietly(Haptics.selectionAsync()),
  confirm: () => quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

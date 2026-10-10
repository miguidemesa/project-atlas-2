import * as Haptics from "expo-haptics";
import { haptics } from "./haptics";

beforeEach(() => jest.clearAllMocks());

it("maps the app's three haptics to the system ones", () => {
  haptics.tick();
  haptics.confirm();
  haptics.warn();

  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(1, Haptics.NotificationFeedbackType.Success);
  expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(2, Haptics.NotificationFeedbackType.Warning);
});

it("stays quiet on a phone without a haptic engine", async () => {
  jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error("unavailable"));
  expect(() => haptics.tick()).not.toThrow();
  await Promise.resolve(); // the rejection is handled, so Jest reports no unhandled promise
});

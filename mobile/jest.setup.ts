// Native modules Jest can't run. Each task that installs a native library adds its mock here.
import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Reanimated runs animations on Jest's timers and adds the toHaveAnimatedStyle matcher. Worklets has no native
// side in Jest, so its mock goes in first.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
require("react-native-reanimated").setUpTests();

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

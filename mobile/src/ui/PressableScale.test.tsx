import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { PressableScale } from "./PressableScale";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("presses in to 0.97, comes back out, and still reports the press", async () => {
  const onPress = jest.fn();
  await render(
    <PressableScale testID="go" accessibilityRole="button" onPress={onPress}>
      <Text>Go</Text>
    </PressableScale>,
  );
  const button = screen.getByTestId("go");

  await fireEvent(button, "pressIn");
  await act(() => jest.advanceTimersByTime(200));
  expect(button).toHaveAnimatedStyle({ transform: [{ scale: 0.97 }] });

  await fireEvent(button, "pressOut");
  await act(() => jest.advanceTimersByTime(200));
  expect(button).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });

  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

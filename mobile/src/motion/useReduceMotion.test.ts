import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReduceMotion, watchReduceMotion } from "./useReduceMotion";

it("follows the system Reduce Motion setting, from launch and as it changes", async () => {
  let changed: (on: boolean) => void = () => undefined;
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, handler) => {
    changed = handler as unknown as (on: boolean) => void;
    return { remove: jest.fn() } as never;
  });
  const stop = watchReduceMotion();

  const { result } = await renderHook(() => useReduceMotion());
  await waitFor(() => expect(result.current).toBe(true));

  await act(() => changed(false));
  expect(result.current).toBe(false);
  stop();
});

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { getAnimatedStyle } from "react-native-reanimated";
import type { Listing } from "@atlas/api";
import { LiftPeek, type Lifted } from "./LiftPeek";

let mockReduceMotion = false;
jest.mock("@/motion/useReduceMotion", () => ({ useReduceMotion: () => mockReduceMotion }));

// Only the fields the peek reads.
const listing = { id: "l1", title: "Mew ex SIR", price: 6800, format: "fixed", imageUrl: null, photos: [] } as unknown as Listing;
const lifted: Lifted = { listing, origin: { x: 16, y: 200, width: 72, height: 100 } };

type CardStyle = { transform?: Record<string, number>[]; opacity?: number };
const styleOf = (element: Parameters<typeof getAnimatedStyle>[0]) => getAnimatedStyle(element) as unknown as CardStyle;

function expectAtRest(style: CardStyle) {
  const [x, y, scale] = style.transform ?? [];
  expect(x.translateX).toBeCloseTo(0);
  expect(y.translateY).toBeCloseTo(0);
  expect(scale.scale).toBeCloseTo(1);
}

beforeEach(() => {
  mockReduceMotion = false;
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

it("lifts the card out of its sleeve and flies it to the middle, with a tick", async () => {
  await render(<LiftPeek lifted={lifted} onClose={jest.fn()} />);
  const card = screen.getByTestId("lift-peek");
  const start = styleOf(card);
  expect(start.transform?.[2].scale).toBeLessThan(1); // starts at the sleeve's size, where the sleeve is
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

  await act(() => jest.advanceTimersByTime(1000));
  expectAtRest(styleOf(card));
});

it("fades in where it lands under Reduce Motion, with no flight", async () => {
  mockReduceMotion = true;
  await render(<LiftPeek lifted={lifted} onClose={jest.fn()} />);
  const card = screen.getByTestId("lift-peek");
  expectAtRest(styleOf(card));
  expect(styleOf(card).opacity).toBe(0);

  await act(() => jest.advanceTimersByTime(300));
  expect(styleOf(card).opacity).toBe(1);
});

it("drops the card back before closing when the scrim is tapped", async () => {
  const onClose = jest.fn();
  await render(<LiftPeek lifted={lifted} onClose={onClose} />);
  await act(() => jest.advanceTimersByTime(1000));

  await fireEvent.press(screen.getByTestId("lift-scrim"));
  expect(onClose).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(200));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("closes on a quick flick down, however short", async () => {
  const onClose = jest.fn();
  await render(<LiftPeek lifted={lifted} onClose={onClose} />);

  await act(() =>
    fireGestureHandler(getByGestureTestId("lift-flick"), [
      { state: State.BEGAN },
      { state: State.ACTIVE, translationY: 12, velocityY: 1400 },
      { state: State.END, translationY: 12, velocityY: 1400 },
    ]),
  );
  await act(() => jest.advanceTimersByTime(200));
  expect(onClose).toHaveBeenCalledTimes(1);
});

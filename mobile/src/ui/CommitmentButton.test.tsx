import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { setOnline } from "@/test/net";
import { CommitmentButton } from "./CommitmentButton";

afterEach(() => setOnline(true));

it("is disabled offline, says why, and never runs or queues the action", async () => {
  setOnline(false);
  const onPress = jest.fn(async () => undefined);
  await render(<CommitmentButton label="Place bid" offlineReason="Reconnect to place your bid." onPress={onPress} />);

  expect(screen.getByRole("button", { name: "Place bid" })).toBeDisabled();
  expect(screen.getByText("Reconnect to place your bid.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Place bid" }));

  setOnline(true); // coming back online must not run it either
  await act(async () => undefined);
  expect(onPress).not.toHaveBeenCalled();
});

it("runs once per press and can't be pressed again while it runs", async () => {
  let finish = () => {};
  const onPress = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
  await render(<CommitmentButton label="Pay ₱12,500" offlineReason="Reconnect to pay." onPress={onPress} />);

  await fireEvent.press(screen.getByRole("button", { name: "Pay ₱12,500" }));
  await fireEvent.press(screen.getByRole("button", { name: "Pay ₱12,500" }));
  expect(onPress).toHaveBeenCalledTimes(1);

  await act(async () => finish());
  expect(screen.getByRole("button", { name: "Pay ₱12,500" })).toBeEnabled();
});

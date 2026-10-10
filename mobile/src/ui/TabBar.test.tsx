import { fireEvent, render, screen } from "@testing-library/react-native";
import { TabBar } from "./TabBar";

it("shows the five tabs from the designs and marks the current one", async () => {
  await render(<TabBar current="store" onSelect={jest.fn()} bottomInset={0} />);

  for (const name of ["Store", "Search", "Sell", "Inbox", "Me"]) {
    expect(screen.getByRole("tab", { name })).toBeOnTheScreen();
  }
  expect(screen.getByRole("tab", { name: "Store", selected: true })).toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "Me", selected: false })).toBeOnTheScreen();
});

it("switches tabs when one is pressed", async () => {
  const onSelect = jest.fn();
  await render(<TabBar current="store" onSelect={onSelect} bottomInset={0} />);

  await fireEvent.press(screen.getByRole("tab", { name: "Me" }));

  expect(onSelect).toHaveBeenCalledWith("me");
});

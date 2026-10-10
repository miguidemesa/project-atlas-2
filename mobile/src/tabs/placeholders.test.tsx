import { render, screen } from "@testing-library/react-native";
import { InboxScreen, SearchScreen, SellScreen } from "./placeholders";

it.each([
  [SearchScreen, "Search is on its way"],
  [SellScreen, "Selling from the app is on its way"],
  [InboxScreen, "Messages are on their way"],
])("says plainly what isn't here yet (%#)", async (Tab, heading) => {
  await render(<Tab />);
  expect(screen.getByText(heading)).toBeOnTheScreen();
});

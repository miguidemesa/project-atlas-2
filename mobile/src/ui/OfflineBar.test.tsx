import { render, screen } from "@testing-library/react-native";
import { setOnline } from "@/test/net";
import { OfflineBar } from "./OfflineBar";

afterEach(() => setOnline(true));

it("stays out of the way while online", async () => {
  setOnline(true);
  await render(<OfflineBar />);
  expect(screen.queryByText("You're offline. Showing saved results.")).toBeNull();
});

it("appears when the phone goes offline", async () => {
  setOnline(false);
  await render(<OfflineBar />);
  expect(screen.getByText("You're offline. Showing saved results.")).toBeOnTheScreen();
});

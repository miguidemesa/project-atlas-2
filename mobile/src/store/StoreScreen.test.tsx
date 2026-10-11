import { fireEvent, screen } from "@testing-library/react-native";
import { fakeApi } from "@/test/fake-api";
import { renderApp } from "@/test/render";
import { StoreScreen } from "./StoreScreen";
import * as Haptics from "expo-haptics";
import { Share } from "react-native";

const listing = (id: string, title: string, price: number) => ({
  id, title, price, format: "fixed", set: "151", year: 2023, cardNumber: "199/165", sellerName: "Kolektib & Co.", sellerVerified: false,
});
const storefront = (shelves: Record<string, unknown[]>) => ({
  category: null, activeListings: 2, categories: [], spotlight: [], trending: [], grails: [], endingSoon: [],
  newArrivals: [], recentlySold: [], sets: [], generatedAt: "2026-10-05T00:00:00Z", ...shelves,
});

it("lists the storefront's first shelf with peso prices", async () => {
  fakeApi({ "GET /api/storefront": [200, { data: storefront({ trending: [listing("l1", "Mew ex SIR", 6800), listing("l2", "Charizard ex", 12500)] }) }] });

  await renderApp(<StoreScreen />);

  expect(await screen.findByText("Mew ex SIR")).toBeOnTheScreen();
  expect(screen.getByText("Trending")).toBeOnTheScreen();
  expect(screen.getByText("₱12,500")).toBeOnTheScreen();
  expect(screen.getByTestId("store-list")).toBeOnTheScreen();
});

it("shows an error with Try again instead of stand-in listings, and retries", async () => {
  fakeApi({ "GET /api/storefront": [500, { error: "Something broke." }] });
  await renderApp(<StoreScreen />);
  expect(await screen.findByText("Couldn't load the store")).toBeOnTheScreen();

  fakeApi({ "GET /api/storefront": [200, { data: storefront({ newArrivals: [listing("l3", "Pikachu ex", 4200)] }) }] });
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

  expect(await screen.findByText("Pikachu ex")).toBeOnTheScreen();
});

it("says the store is empty when every shelf is", async () => {
  fakeApi({ "GET /api/storefront": [200, { data: storefront({}) }] });
  await renderApp(<StoreScreen />);
  expect(await screen.findByText("Nothing for sale yet")).toBeOnTheScreen();
});

// Where the row's sleeve sits; measuring needs a native layout, which Jest doesn't have.
jest.mock("@/cards/measure", () => ({
  measureOrigin: (_view: unknown, done: (origin: unknown) => void) => done({ x: 16, y: 200, width: 72, height: 100 }),
}));

beforeEach(() => jest.clearAllMocks());

const oneCard = () =>
  fakeApi({ "GET /api/storefront": [200, { data: storefront({ trending: [listing("l1", "Mew ex SIR", 6800)] }) }] });

it("lifts a card into the peek on a long press", async () => {
  oneCard();
  await renderApp(<StoreScreen />);

  await fireEvent(await screen.findByTestId("listing-row-l1"), "longPress");

  expect(await screen.findByTestId("lift-peek")).toBeOnTheScreen();
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
});

it("shares the listing's web page from the peek", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  oneCard();
  await renderApp(<StoreScreen />);

  await fireEvent(await screen.findByTestId("listing-row-l1"), "longPress");
  await fireEvent.press(await screen.findByTestId("lift-share"));

  expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "http://localhost:3000/listing/l1" }));
});

it("offers Share to screen readers without a long press", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  oneCard();
  await renderApp(<StoreScreen />);

  await fireEvent(await screen.findByTestId("listing-row-l1"), "accessibilityAction", { nativeEvent: { actionName: "share" } });

  expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "http://localhost:3000/listing/l1" }));
});

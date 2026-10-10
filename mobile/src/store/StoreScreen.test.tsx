import { fireEvent, screen } from "@testing-library/react-native";
import { fakeApi } from "@/test/fake-api";
import { renderApp } from "@/test/render";
import { StoreScreen } from "./StoreScreen";

const listing = (id: string, title: string, price: number) => ({
  id, title, price, format: "fixed", set: "151", year: 2023, cardNumber: "199/165", sellerName: "Kolektib & Co.",
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

import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import { NOTIFICATION_CATEGORIES } from "@atlas/api";
import { secureTokenStore } from "@/session/token-store";
import { fakeApi } from "@/test/fake-api";
import { renderApp } from "@/test/render";
import { ANA } from "@/test/session";
import { NotificationSettingsScreen } from "./NotificationSettingsScreen";
import { requestPushPermission } from "./push";

jest.mock("./push", () => ({ requestPushPermission: jest.fn(async () => "granted") }));

const prefs = (off: string[] = []) => NOTIFICATION_CATEGORIES.map((c) => ({ category: c.id, pushEnabled: !off.includes(c.id) }));

beforeEach(() => secureTokenStore.save(ANA));
afterEach(async () => {
  await secureTokenStore.clear();
  jest.clearAllMocks();
});

it("lists every category with push on, and saves a change", async () => {
  const calls = fakeApi({
    "GET /api/me/notification-preferences": [200, { data: prefs() }],
    "PUT /api/me/notification-preferences": [200, { data: prefs(["offers"]) }],
  });
  await renderApp(<NotificationSettingsScreen />);

  expect(await screen.findByRole("switch", { name: "Offers" })).toBeChecked();
  expect(screen.getByRole("switch", { name: "Bids and auctions" })).toBeChecked();
  await fireEvent(screen.getByRole("switch", { name: "Offers" }), "valueChange", false);

  await waitFor(() => expect(screen.getByRole("switch", { name: "Offers" })).not.toBeChecked());
  expect(calls).toContainEqual(expect.objectContaining({ method: "PUT", body: { preferences: prefs(["offers"]) } }));
});

it("asks for permission only when the person taps Turn on alerts", async () => {
  fakeApi({ "GET /api/me/notification-preferences": [200, { data: prefs() }] });
  await renderApp(<NotificationSettingsScreen />);

  expect(await screen.findByText("Get told when you're outbid, an order ships or an offer comes in.")).toBeOnTheScreen();
  expect(requestPushPermission).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Turn on alerts" }));

  expect(requestPushPermission).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("Push alerts are on for this phone.")).toBeOnTheScreen();
});

it("sends people to the phone's settings when alerts were turned off there", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false, canAskAgain: false } as never);
  fakeApi({ "GET /api/me/notification-preferences": [200, { data: prefs() }] });
  await renderApp(<NotificationSettingsScreen />);

  await fireEvent.press(await screen.findByRole("button", { name: "Open settings" }));

  expect(Linking.openSettings).toHaveBeenCalled();
});

it("shows an error with Try again when the settings can't load", async () => {
  fakeApi({ "GET /api/me/notification-preferences": [500, { error: "Something broke." }] });
  await renderApp(<NotificationSettingsScreen />);

  expect(await screen.findByText("Couldn't load your settings")).toBeOnTheScreen();
  fakeApi({ "GET /api/me/notification-preferences": [200, { data: prefs() }] });
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("switch", { name: "Orders" })).toBeOnTheScreen();
});

it("sends a test alert from a development build", async () => {
  const calls = fakeApi({
    "GET /api/me/notification-preferences": [200, { data: prefs() }],
    "POST /api/me/notifications/test": [202, { data: { id: "n1" } }],
  });
  await renderApp(<NotificationSettingsScreen />);

  await fireEvent.press(await screen.findByRole("button", { name: "Send me a test alert" }));

  expect(await screen.findByText("Test alert sent. It arrives in a few seconds.")).toBeOnTheScreen();
  expect(calls).toContainEqual(expect.objectContaining({ method: "POST", path: "/api/me/notifications/test" }));
});

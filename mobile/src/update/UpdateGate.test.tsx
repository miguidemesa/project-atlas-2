import { fireEvent, screen } from "@testing-library/react-native";
import { Linking, Platform, Text } from "react-native";
import { fakeApi } from "@/test/fake-api";
import { renderApp } from "@/test/render";
import { UpdateGate } from "./UpdateGate";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { version: "1.0.0", ios: {}, android: { playStoreUrl: "https://play.google.com/store/apps/details?id=ph.atlas.app" } },
  },
}));

const app = (
  <UpdateGate>
    <Text>Store</Text>
  </UpdateGate>
);

it("opens the app when this build is new enough", async () => {
  fakeApi({ "GET /api/app-config": [200, { data: { minimumAppVersion: "1.0.0" } }] });
  await renderApp(app);
  expect(await screen.findByText("Store")).toBeOnTheScreen();
});

it("shows Update Atlas with a store link when this build is too old", async () => {
  const android = jest.replaceProperty(Platform, "OS", "android");
  fakeApi({ "GET /api/app-config": [200, { data: { minimumAppVersion: "1.1.0" } }] });
  await renderApp(app);

  await fireEvent.press(await screen.findByRole("button", { name: "Update" }));

  expect(Linking.openURL).toHaveBeenCalledWith("https://play.google.com/store/apps/details?id=ph.atlas.app");
  expect(screen.queryByText("Store")).toBeNull();
  android.restore();
});

it("says where to update when there's no store link yet", async () => {
  fakeApi({ "GET /api/app-config": [200, { data: { minimumAppVersion: "2.0.0" } }] });
  await renderApp(app);

  expect(await screen.findByText("This version of Atlas is out of date. Update it from the App Store or Google Play.")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
});

it("keeps the app open when the config can't be read", async () => {
  fakeApi({ "GET /api/app-config": [500, { error: "Down." }] });
  await renderApp(app);
  expect(await screen.findByText("Store")).toBeOnTheScreen();
});

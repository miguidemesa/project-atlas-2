import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { secureTokenStore } from "@/session/token-store";
import { fakeApi, goOffline } from "@/test/fake-api";
import { ANA } from "@/test/session";
import {
  appPathFromUrl,
  createChannels,
  registerThisPhone,
  requestPushPermission,
  unregisterThisPhone,
  useNotificationTaps,
  usePushRegistration,
} from "./push";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const TOKEN = "ExponentPushToken[test-phone]";
const DEVICE_PATH = "/api/me/devices/ExponentPushToken%5Btest-phone%5D";

beforeEach(() => secureTokenStore.save(ANA));
afterEach(async () => {
  await secureTokenStore.clear();
  jest.clearAllMocks(); // keeps the setup file's mock implementations; replaced properties are restored in their tests
});

describe("requestPushPermission", () => {
  it("asks, then registers this phone with the signed-in account", async () => {
    const calls = fakeApi({ "POST /api/me/devices": [200, { data: { token: TOKEN, platform: "ios" } }] });

    await expect(requestPushPermission()).resolves.toBe("granted");

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      { method: "POST", path: "/api/me/devices", body: { token: TOKEN, platform: "ios" }, authorization: "Bearer access-1" },
    ]);
  });

  it("never registers without permission", async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const calls = fakeApi({});

    await expect(requestPushPermission()).resolves.toBe("denied");
    expect(calls).toEqual([]);
  });

  it("does nothing on a simulator, which can't receive Expo push", async () => {
    const simulator = jest.replaceProperty(Device, "isDevice", false);

    await expect(requestPushPermission()).resolves.toBe("unavailable");
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    simulator.restore();
  });
});

it("registers at launch only when permission was already given, and never prompts", async () => {
  const calls = fakeApi({ "POST /api/me/devices": [200, { data: {} }] });
  await expect(registerThisPhone()).resolves.toBe(false);
  expect(calls).toEqual([]);

  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);
  await expect(registerThisPhone()).resolves.toBe(true);
  expect(calls).toHaveLength(1);
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});

it("creates one Android channel per category", async () => {
  const android = jest.replaceProperty(Platform, "OS", "android");

  await createChannels();

  expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.calls.map(([id]) => id)).toEqual([
    "bids",
    "orders",
    "offers",
    "following",
    "announcements",
  ]);
  android.restore();
});

it("unregisters the phone it registered, and sign-out still works offline", async () => {
  fakeApi({ "POST /api/me/devices": [200, { data: {} }] });
  await requestPushPermission();
  const calls = fakeApi({ [`DELETE ${DEVICE_PATH}`]: [204] });

  await unregisterThisPhone();
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([`DELETE ${DEVICE_PATH}`]);

  fakeApi({ "POST /api/me/devices": [200, { data: {} }] });
  await requestPushPermission();
  goOffline();
  await expect(unregisterThisPhone()).resolves.toBeUndefined();
});

it("opens atlas:// links from alerts and ignores everything else", () => {
  expect(appPathFromUrl("atlas://me/notifications")).toBe("/me/notifications");
  expect(appPathFromUrl("https://evil.example/phish")).toBeNull();
  expect(appPathFromUrl("javascript:alert(1)")).toBeNull();
  expect(appPathFromUrl(undefined)).toBeNull();
  expect(appPathFromUrl(42)).toBeNull();
});

it("opens the screen a tapped alert links to", async () => {
  jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue({
    notification: { request: { content: { data: { url: "atlas://me/notifications" } } } },
  } as never);

  await renderHook(() => useNotificationTaps());

  expect(router.push).toHaveBeenCalledWith("/me/notifications");
  jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue(null);
});

it("registers this phone once signed in, and again whenever its token changes", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true, canAskAgain: true } as never);
  const calls = fakeApi({ "POST /api/me/devices": [200, { data: {} }] });

  await renderHook(() => usePushRegistration(false));
  expect(calls).toEqual([]);

  await renderHook(() => usePushRegistration(true));
  await waitFor(() => expect(calls).toHaveLength(1));

  const onTokenChange = jest.mocked(Notifications.addPushTokenListener).mock.calls[0][0];
  await act(async () => onTokenChange({ type: "ios", data: "new-device-token" }));
  await waitFor(() => expect(calls).toHaveLength(2));
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: true } as never);
});

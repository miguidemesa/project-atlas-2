import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { NOTIFICATION_CATEGORIES } from "@atlas/api";
import { api } from "@/api/client";

export type PushPermission = "granted" | "denied" | "unavailable";

/** The token this phone registered, so sign-out can remove it. */
let registeredToken: string | null = null;

/** Shows alerts that arrive while Atlas is open. The root layout calls this once. */
export function showAlertsInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** One Android channel per category, so people can mute one kind of alert and keep the rest. */
export async function createChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  for (const category of NOTIFICATION_CATEGORIES) {
    await Notifications.setNotificationChannelAsync(category.id, {
      name: category.name,
      description: category.description,
      importance: category.id === "bids" ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function register(): Promise<void> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.registerDevice(token, Platform.OS === "ios" ? "ios" : "android");
  registeredToken = token;
}

/**
 * Asks for permission at a meaningful moment, never at launch: the first bid, watch or saved event
 * (P4 to P7 call this) or, in M1, the notification settings screen. Then registers this phone.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!Device.isDevice) return "unavailable"; // simulators and emulators can't receive Expo push
  await createChannels(); // Android 13 shows the prompt only once a channel exists
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return "denied";
  await register();
  return "granted";
}

/** At launch and when the token changes: registers this phone if permission was already given. Never prompts. */
export async function registerThisPhone(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return false;
  await createChannels();
  await register();
  return true;
}

/**
 * Sign-out: stops alerts to this phone. Offline, the request fails and is dropped on purpose: signing
 * out must still work, and the next sign-in on this phone moves the token to that account.
 */
export async function unregisterThisPhone(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (token) await api.unregisterDevice(token).catch(() => undefined);
}

/** The in-app path for an alert's atlas:// link, or null for anything else: nothing outside Atlas opens from an alert. */
export function appPathFromUrl(url: unknown): Href | null {
  if (typeof url !== "string" || !url.startsWith("atlas://")) return null;
  return `/${url.slice("atlas://".length)}` as Href;
}

/** After sign-in (and at each launch while signed in) registers this phone, and again whenever its token changes. */
export function usePushRegistration(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) return;
    // a failure is retried at the next launch or token change; an alert setting isn't worth an error screen
    const register = () => void registerThisPhone().catch(() => false);
    register();
    const subscription = Notifications.addPushTokenListener(register);
    return () => subscription.remove();
  }, [signedIn]);
}

/** Opens the screen a tapped alert links to, including the tap that launched the app. */
export function useNotificationTaps(): void {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const path = appPathFromUrl(response?.notification.request.content.data?.url);
    if (path) router.push(path);
  }, [response]);
}

import { DeviceEventEmitter } from "react-native";
import { createClient, createEndpoints } from "@atlas/api";
import { secureTokenStore } from "@/session/token-store";

/** Emitted when the API refuses to refresh the session; SessionProvider signs the person out. */
export const SIGNED_OUT = "atlas.signed-out";

/** The iOS Simulator reaches the Mac's localhost; the Android emulator needs EXPO_PUBLIC_API_URL=http://10.0.2.2:5080. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5080";

export const client = createClient({
  baseUrl: API_URL,
  tokenStore: secureTokenStore,
  onSignedOut: () => DeviceEventEmitter.emit(SIGNED_OUT),
});

export const api = createEndpoints(client);

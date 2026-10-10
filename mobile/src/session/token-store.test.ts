import * as SecureStore from "expo-secure-store";
import { ANA } from "@/test/session";
import { secureTokenStore } from "./token-store";

afterEach(() => secureTokenStore.clear());

it("keeps the refresh token in the secure store and the access token in memory only", async () => {
  await secureTokenStore.save(ANA);

  expect(await secureTokenStore.getAccessToken()).toBe("access-1");
  expect(await secureTokenStore.getRefreshToken()).toBe("refresh-1");
  expect(JSON.parse((await SecureStore.getItemAsync("atlas.session"))!)).toEqual({ refreshToken: "refresh-1", user: ANA.user });
});

it("remembers who is signed in for the next launch", async () => {
  await secureTokenStore.save(ANA);
  expect(await secureTokenStore.getUser()).toEqual(ANA.user);
});

it("forgets both tokens on sign-out", async () => {
  await secureTokenStore.save(ANA);
  await secureTokenStore.clear();

  expect(await secureTokenStore.getAccessToken()).toBeNull();
  expect(await SecureStore.getItemAsync("atlas.session")).toBeNull();
});

it("treats an unreadable entry as signed out", async () => {
  await SecureStore.setItemAsync("atlas.session", "{oops");
  expect(await secureTokenStore.getRefreshToken()).toBeNull();
});

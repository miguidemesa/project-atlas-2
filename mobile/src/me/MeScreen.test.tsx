import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { secureTokenStore } from "@/session/token-store";
import { renderApp } from "@/test/render";
import { ANA } from "@/test/session";
import { MeScreen } from "./MeScreen";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));

afterEach(() => secureTokenStore.clear());

it("offers sign-in and a new account when signed out", async () => {
  await renderApp(<MeScreen />);

  await fireEvent.press(await screen.findByRole("button", { name: "Sign in" }));
  expect(router.push).toHaveBeenCalledWith("/sign-in");

  await fireEvent.press(screen.getByRole("button", { name: "Create an account" }));
  expect(router.push).toHaveBeenCalledWith("/register");
});

it("shows who is signed in and signs out", async () => {
  await secureTokenStore.save(ANA);
  await renderApp(<MeScreen />);

  expect(await screen.findByText("Ana Reyes")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Notifications" }));
  expect(router.push).toHaveBeenCalledWith("/me/notifications");
  await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));
  expect(router.push).toHaveBeenCalledWith("/me/delete-account");
  await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));

  expect(await screen.findByRole("button", { name: "Sign in" })).toBeOnTheScreen();
  expect(await secureTokenStore.getRefreshToken()).toBeNull();
});

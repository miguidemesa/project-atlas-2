import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { fakeApi, goOffline } from "@/test/fake-api";
import { renderApp } from "@/test/render";
import { ANA } from "@/test/session";
import { SignInScreen } from "./SignInScreen";
import { secureTokenStore } from "./token-store";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));

afterEach(() => secureTokenStore.clear());

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), password);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
}

it("checks the form before sending anything", async () => {
  const calls = fakeApi({});
  await renderApp(<SignInScreen />);

  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  expect(screen.getByText("Enter a valid email address.")).toBeOnTheScreen();
  expect(screen.getByText("Enter your password.")).toBeOnTheScreen();
  expect(calls).toEqual([]);
});

it("signs in and closes the modal", async () => {
  const calls = fakeApi({ "POST /api/auth/login": [200, { data: ANA }] });
  await renderApp(<SignInScreen />);

  await fill("Ana@Example.com", "Password123");

  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(calls[0].body).toEqual({ email: "ana@example.com", password: "Password123" });
});

it("shows the API's reason when sign-in is refused, and a connection message when offline", async () => {
  fakeApi({ "POST /api/auth/login": [400, { error: "Email or password is incorrect." }] });
  await renderApp(<SignInScreen />);

  await fill("ana@example.com", "wrong-password");
  expect(await screen.findByText("Email or password is incorrect.")).toBeOnTheScreen();

  goOffline();
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Couldn't reach Atlas. Check your connection and try again.")).toBeOnTheScreen();
});

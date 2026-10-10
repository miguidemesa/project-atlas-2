import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { fakeApi } from "@/test/fake-api";
import { renderApp } from "@/test/render";
import { ANA } from "@/test/session";
import { RegisterScreen } from "./RegisterScreen";
import { secureTokenStore } from "./token-store";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));

afterEach(() => secureTokenStore.clear());

async function fill(name: string, email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("Name"), name);
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), password);
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
}

it("checks the name and password before sending anything", async () => {
  const calls = fakeApi({});
  await renderApp(<RegisterScreen />);

  await fill("A", "ana@example.com", "short");

  expect(screen.getByText("Tell us your name.")).toBeOnTheScreen();
  expect(screen.getByText("Use at least 8 characters.")).toBeOnTheScreen();
  expect(calls).toEqual([]);
});

it("says when an email is taken, then creates the account and closes the modal", async () => {
  fakeApi({ "POST /api/auth/register": [400, { error: "That email is already registered." }] });
  await renderApp(<RegisterScreen />);
  await fill("Ana Reyes", "ana@example.com", "Password123");
  expect(await screen.findByText("That email is already registered.")).toBeOnTheScreen();

  const calls = fakeApi({ "POST /api/auth/register": [200, { data: ANA }] });
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(calls[0].body).toEqual({ email: "ana@example.com", name: "Ana Reyes", password: "Password123" });
});

import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { secureTokenStore } from "@/session/token-store";
import { fakeApi } from "@/test/fake-api";
import { setOnline } from "@/test/net";
import { renderApp } from "@/test/render";
import { ANA } from "@/test/session";
import { DeleteAccountScreen } from "./DeleteAccountScreen";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));

beforeEach(() => secureTokenStore.save(ANA));
afterEach(async () => {
  await secureTokenStore.clear();
  setOnline(true);
  jest.clearAllMocks();
});

it("deletes only after the person types DELETE, then signs out", async () => {
  const calls = fakeApi({ "DELETE /api/me": [204] });
  await renderApp(<DeleteAccountScreen />);

  expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
  await fireEvent.press(screen.getByRole("button", { name: "Delete my account" }));

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/me"));
  expect(calls).toContainEqual(expect.objectContaining({ method: "DELETE", path: "/api/me" }));
  expect(await secureTokenStore.getRefreshToken()).toBeNull();
});

it("says what to finish first when the API refuses, and keeps the person signed in", async () => {
  fakeApi({ "DELETE /api/me": [409, { error: "Before you can delete your account, finish your open order." }] });
  await renderApp(<DeleteAccountScreen />);

  await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
  await fireEvent.press(screen.getByRole("button", { name: "Delete my account" }));

  expect(await screen.findByText("Before you can delete your account, finish your open order.")).toBeOnTheScreen();
  expect(await secureTokenStore.getRefreshToken()).toBe("refresh-1");
  expect(router.replace).not.toHaveBeenCalled();
});

it("can't delete while offline, and says why", async () => {
  setOnline(false);
  await renderApp(<DeleteAccountScreen />);

  await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");

  expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  expect(screen.getByText("Reconnect to delete your account.")).toBeOnTheScreen();
});

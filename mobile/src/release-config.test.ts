import appJson from "../app.json";
import eas from "../eas.json";

it("has a development client, store-ready previews and production builds", () => {
  expect(Object.keys(eas.build)).toEqual(["development", "preview", "production"]);
  expect(eas.build.development).toMatchObject({ developmentClient: true, distribution: "internal" });
  expect(eas.build.preview).toMatchObject({ distribution: "store", channel: "preview" });
  expect(eas.build.production).toMatchObject({ channel: "production", autoIncrement: true });
  expect(eas.submit.preview.android.track).toBe("internal");
});

it("ships no secrets: API addresses and keys live in EAS environments", () => {
  expect(JSON.stringify(eas)).not.toMatch(/EXPO_PUBLIC_|KEY|SECRET|TOKEN|PASSWORD/i);
});

it("ties JavaScript updates to the app version", () => {
  expect(appJson.expo.runtimeVersion).toEqual({ policy: "appVersion" });
});

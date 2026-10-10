import { photoUri } from "./photo-uri";

const ORIGINS = { api: "http://10.0.2.2:5080", web: "http://10.0.2.2:3000" };

it("joins a relative photo path to the web origin, where the web serves it", () => {
  expect(photoUri("/seed-images/mew.png", ORIGINS)).toBe("http://10.0.2.2:3000/seed-images/mew.png");
  expect(photoUri("/seed-images/mew.png", { ...ORIGINS, web: "http://10.0.2.2:3000/" })).toBe("http://10.0.2.2:3000/seed-images/mew.png");
});

it("re-points a localhost photo at the host this build reaches, keeping its port (the Android emulator can't reach localhost)", () => {
  expect(photoUri("http://localhost:5080/uploads/mew.jpg?v=2", ORIGINS)).toBe("http://10.0.2.2:5080/uploads/mew.jpg?v=2");
  expect(photoUri("http://127.0.0.1:3000/seed-images/mew.png", ORIGINS)).toBe("http://10.0.2.2:3000/seed-images/mew.png");
});

it("leaves a real photo host alone", () => {
  expect(photoUri("https://cdn.atlas.ph/uploads/mew.jpg", ORIGINS)).toBe("https://cdn.atlas.ph/uploads/mew.jpg");
  expect(photoUri("http://localhost.example.com/mew.jpg", ORIGINS)).toBe("http://localhost.example.com/mew.jpg");
});

it("refuses anything that isn't a web photo", () => {
  for (const url of [null, undefined, "", "javascript:alert(1)", "file:///etc/passwd", "uploads/mew.jpg"]) {
    expect(photoUri(url, ORIGINS)).toBeNull();
  }
});

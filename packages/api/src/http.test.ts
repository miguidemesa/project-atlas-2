import { describe, expect, it } from "vitest";
import { ApiError, apiUrl, readData } from "./http";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("apiUrl", () => {
  it("adds /api exactly once and ignores a trailing slash on the base", () => {
    expect(apiUrl("http://localhost:5080", "/listings")).toBe("http://localhost:5080/api/listings");
    expect(apiUrl("http://localhost:5080/", "/api/listings")).toBe("http://localhost:5080/api/listings");
    expect(apiUrl("http://localhost:5080", "listings")).toBe("http://localhost:5080/api/listings");
  });
});

describe("readData", () => {
  it("unwraps the data envelope", async () => {
    await expect(readData(json(200, { data: { items: [1] } }))).resolves.toEqual({ items: [1] });
  });

  it("throws the server's error message with its status", async () => {
    await expect(readData(json(409, { error: "Before you can delete your account, finish your open order." }))).rejects.toMatchObject({
      status: 409,
      message: "Before you can delete your account, finish your open order.",
    });
  });

  it("names the status when the body isn't JSON", async () => {
    await expect(readData(new Response("<html>", { status: 502 }))).rejects.toEqual(new ApiError(502, "Request failed (502)"));
  });

  it("resolves a 204 to undefined", async () => {
    await expect(readData(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });
});

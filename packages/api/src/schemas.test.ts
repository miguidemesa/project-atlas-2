import { describe, expect, it } from "vitest";
import { registerSchema, signInSchema } from "./schemas";

describe("signInSchema", () => {
  it("trims and lowercases the email", () => {
    expect(signInSchema.parse({ email: "  Ana@Example.COM ", password: "x" })).toEqual({ email: "ana@example.com", password: "x" });
  });

  it("explains what's wrong with each field", () => {
    const result = signInSchema.safeParse({ email: "ana", password: "" });
    expect(result.error?.issues.map((i) => i.message)).toEqual(["Enter a valid email address.", "Enter your password."]);
  });
});

describe("registerSchema", () => {
  it("needs a name and an 8-character password, like the API", () => {
    const result = registerSchema.safeParse({ name: "A", email: "ana@example.com", password: "short" });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["name", "password"]);
  });
});

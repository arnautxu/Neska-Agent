import { describe, expect, it } from "vitest";
import { validPrivateInputValues } from "./secure-input-contract";

describe("private input payload", () => {
  it("accepts only the preset's exact bounded fields and rejects extra keys and controls", () => {
    expect(validPrivateInputValues("login", { email: "employee", password: "synthetic-password" })).toBe(true);
    expect(validPrivateInputValues("login", { email: "employee", password: "synthetic-password", model: "leak" })).toBe(false);
    expect(validPrivateInputValues("otp", { code: "123456" })).toBe(true);
    expect(validPrivateInputValues("otp", { code: "12345a" })).toBe(false);
    expect(validPrivateInputValues("pin", { pin: "1234" })).toBe(true);
    expect(validPrivateInputValues("pin", { pin: "123456" })).toBe(false);
    expect(validPrivateInputValues("secret", { code: "x".repeat(4097) })).toBe(false);
    expect(validPrivateInputValues("login", { email: "employee", password: "secret\n" })).toBe(false);
  });
});

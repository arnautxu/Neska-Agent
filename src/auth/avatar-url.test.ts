import { describe, expect, it } from "vitest";
import { initialsForName, validatedAvatarUrl } from "./avatar-url";

describe("avatar display boundary", () => {
  it("accepts HTTPS without credentials and rejects local or executable URLs", () => {
    expect(validatedAvatarUrl("https://example.test/avatar.png")).toBe("https://example.test/avatar.png");
    for (const value of ["/branding/private.png", "//evil.example/avatar.png", "javascript:alert(1)", "http://example.test/avatar.png", "https://user:secret@example.test/avatar.png"]) {
      expect(validatedAvatarUrl(value)).toBeNull();
    }
    expect(initialsForName("Example User")).toBe("EU");
  });
});

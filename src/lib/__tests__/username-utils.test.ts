import { describe, it, expect } from "vitest";
import { generateUsernameFromName } from "@/lib/username-utils";

describe("generateUsernameFromName", () => {
  it("converts a normal name to lowercase with underscores", () => {
    expect(generateUsernameFromName("John Smith")).toBe("john_smith");
  });

  it("strips special characters", () => {
    expect(generateUsernameFromName("José García")).toBe("jos_garca");
  });

  it("handles multiple spaces", () => {
    expect(generateUsernameFromName("John   Smith")).toBe("john_smith");
  });

  it("truncates at 20 characters", () => {
    const longName = "Abcdefghij Klmnopqrstuvwxyz";
    expect(generateUsernameFromName(longName).length).toBeLessThanOrEqual(20);
  });

  it("returns 'user' for empty input", () => {
    expect(generateUsernameFromName("")).toBe("user");
    expect(generateUsernameFromName("!!!")).toBe("user");
  });

  it("converts whitespace-only to underscores", () => {
    // spaces become underscores, so "   " → "_" (not the fallback)
    expect(generateUsernameFromName("   ")).toBe("_");
  });

  it("passes through already-valid usernames", () => {
    expect(generateUsernameFromName("owen_marr")).toBe("owen_marr");
  });
});

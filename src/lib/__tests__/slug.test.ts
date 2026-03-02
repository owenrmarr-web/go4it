import { describe, it, expect } from "vitest";
import { generateSlug, isReservedSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it("converts a normal name to a slug", () => {
    expect(generateSlug("Victoria's Flowers")).toBe("victoria-s-flowers");
  });

  it("lowercases and replaces special chars with hyphens", () => {
    expect(generateSlug("My Cool App!")).toBe("my-cool-app");
  });

  it("strips leading and trailing hyphens", () => {
    expect(generateSlug("--hello--")).toBe("hello");
  });

  it("truncates at 40 characters", () => {
    const longName = "A".repeat(50);
    expect(generateSlug(longName).length).toBeLessThanOrEqual(40);
  });

  it("appends -co for short slugs (< 3 chars)", () => {
    expect(generateSlug("ab")).toBe("ab-co");
  });

  it("appends -co for reserved slugs", () => {
    expect(generateSlug("admin")).toBe("admin-co");
    expect(generateSlug("api")).toBe("api-co");
  });
});

describe("isReservedSlug", () => {
  it("returns true for reserved names", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("account")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isReservedSlug("Admin")).toBe(true);
    expect(isReservedSlug("API")).toBe(true);
  });

  it("returns false for non-reserved names", () => {
    expect(isReservedSlug("my-company")).toBe(false);
    expect(isReservedSlug("zenith")).toBe(false);
  });
});

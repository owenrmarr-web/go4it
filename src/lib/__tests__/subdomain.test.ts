import { describe, it, expect } from "vitest";
import { generateSubdomain } from "@/lib/subdomain";

describe("generateSubdomain", () => {
  it("combines app title slug and org slug", () => {
    expect(generateSubdomain("CRM Tool", "zenith")).toBe("crm-tool-zenith");
  });

  it("handles special characters in app title", () => {
    expect(generateSubdomain("Victoria's Scheduler", "flowers")).toBe(
      "victoria-s-scheduler-flowers"
    );
  });

  it("truncates at 63 characters (DNS label limit)", () => {
    const longTitle = "A Very Long Application Name That Goes On And On";
    const longOrg = "extremely-long-organization-slug";
    const result = generateSubdomain(longTitle, longOrg);
    expect(result.length).toBeLessThanOrEqual(63);
  });

  it("strips trailing hyphens after truncation", () => {
    // Create a case where truncation would leave a trailing hyphen
    const title = "A".repeat(30);
    const org = "b".repeat(30);
    const result = generateSubdomain(title, org);
    expect(result).not.toMatch(/-$/);
  });
});

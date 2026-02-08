import prisma from "./prisma";
import { generateSlug } from "./slug";

const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "app", "admin", "mail", "smtp", "ftp",
  "staging", "dev", "test", "beta", "dashboard", "status",
  "docs", "help", "support", "blog", "store", "shop",
]);

const MAX_SUBDOMAIN_LENGTH = 63; // DNS label limit

/**
 * Generate a subdomain from app title and org slug.
 * Format: {appSlug}-{orgSlug}
 * Example: "CRM Tool" + "zenith" → "crm-tool-zenith"
 */
export function generateSubdomain(appTitle: string, orgSlug: string): string {
  const appSlug = generateSlug(appTitle);
  let subdomain = `${appSlug}-${orgSlug}`.substring(0, MAX_SUBDOMAIN_LENGTH);
  subdomain = subdomain.replace(/-+$/, "");
  return subdomain;
}

/**
 * Validate that a subdomain is available and well-formed.
 */
export async function validateSubdomain(
  subdomain: string,
  excludeOrgAppId?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return { valid: false, error: "Subdomain must contain only lowercase letters, numbers, and hyphens" };
  }

  if (subdomain.length < 3) {
    return { valid: false, error: "Subdomain must be at least 3 characters" };
  }

  if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
    return { valid: false, error: `Subdomain must be ${MAX_SUBDOMAIN_LENGTH} characters or less` };
  }

  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { valid: false, error: "This subdomain is reserved" };
  }

  const existing = await prisma.orgApp.findUnique({
    where: { subdomain },
    select: { id: true },
  });

  if (existing && existing.id !== excludeOrgAppId) {
    return { valid: false, error: "This subdomain is already taken" };
  }

  return { valid: true };
}

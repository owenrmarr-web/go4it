const RESERVED_SLUGS = new Set([
  "admin", "account", "auth", "create", "leaderboard", "api",
  "portal", "invite", "org", "settings", "_next", "favicon.ico",
  "login", "signup", "logout", "register", "dashboard",
]);

/**
 * Generate a URL-safe slug from a name.
 * e.g. "Victoria's Flowers" → "victorias-flowers"
 */
export function generateSlug(name: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 40);

  if (slug.length < 3) slug = slug + "-co";
  if (RESERVED_SLUGS.has(slug)) slug = slug + "-co";
  return slug;
}

/**
 * Check if a slug is reserved (conflicts with app routes).
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

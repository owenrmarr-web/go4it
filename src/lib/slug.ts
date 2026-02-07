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
  return slug;
}

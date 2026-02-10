// Pure utility functions — safe for client-side imports (no prisma dependency)

export function generateUsernameFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 20) || "user"
  );
}

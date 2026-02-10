import prisma from "./prisma";

export { generateUsernameFromName } from "./username-utils";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "go4it",
  "system",
  "support",
  "help",
  "null",
  "undefined",
  "anonymous",
  "moderator",
  "bot",
  "api",
]);

export async function validateUsername(
  username: string,
  excludeUserId?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error:
        "Username must be 3-20 characters, lowercase letters, numbers, and underscores only",
    };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, error: "This username is reserved" };
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existing && existing.id !== excludeUserId) {
    return { valid: false, error: "This username is already taken" };
  }

  return { valid: true };
}

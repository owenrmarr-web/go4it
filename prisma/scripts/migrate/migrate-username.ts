import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

function generateUsername(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 20) || "user"
  );
}

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding username field...");

  // Step 1: Add column
  try {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "username" TEXT`);
    console.log("Added username column.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate column")) {
      console.log("username column already exists, skipping.");
    } else {
      throw err;
    }
  }

  // Step 2: Backfill existing users
  const users = await client.execute(
    `SELECT "id", "name" FROM "User" WHERE "username" IS NULL`
  );

  const takenUsernames = new Set<string>();
  const existing = await client.execute(
    `SELECT "username" FROM "User" WHERE "username" IS NOT NULL`
  );
  for (const row of existing.rows) {
    takenUsernames.add(row.username as string);
  }

  for (const row of users.rows) {
    const base = generateUsername(row.name as string);
    let candidate = base;
    let suffix = 2;
    while (takenUsernames.has(candidate)) {
      candidate = `${base}_${suffix}`.substring(0, 20);
      suffix++;
    }
    takenUsernames.add(candidate);
    await client.execute({
      sql: `UPDATE "User" SET "username" = ? WHERE "id" = ?`,
      args: [candidate, row.id as string],
    });
    console.log(`  ${row.name} → @${candidate}`);
  }

  // Step 3: Create unique index
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`
  );

  console.log("Done! All users have usernames.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

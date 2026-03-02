import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Creating AppUpdate and Notification tables...");

  // AppUpdate — tracks changelog per marketplace version bump
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AppUpdate" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "generatedAppId" TEXT NOT NULL,
      "version" INTEGER NOT NULL,
      "summary" TEXT NOT NULL,
      "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("generatedAppId") REFERENCES "GeneratedApp"("id") ON DELETE CASCADE
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS "AppUpdate_generatedAppId_idx" ON "AppUpdate"("generatedAppId")
  `);
  console.log("  AppUpdate table created.");

  // Notification — in-app notifications for org owners
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "link" TEXT,
      "isRead" BOOLEAN NOT NULL DEFAULT 0,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead")
  `);
  console.log("  Notification table created.");

  console.log("Done! AppUpdate and Notification tables ready.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

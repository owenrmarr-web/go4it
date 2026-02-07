import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Creating GeneratedApp table in Turso...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "GeneratedApp" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "prompt" TEXT NOT NULL,
      "title" TEXT,
      "description" TEXT,
      "sourceDir" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "error" TEXT,
      "createdById" TEXT NOT NULL,
      "appId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "GeneratedApp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "GeneratedApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedApp_appId_key" ON "GeneratedApp"("appId")
  `);

  console.log("Done! GeneratedApp table created.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding AppIteration table and iterationCount column...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AppIteration" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "generatedAppId" TEXT NOT NULL,
      "prompt" TEXT NOT NULL,
      "sequenceNumber" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "error" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AppIteration_generatedAppId_fkey" FOREIGN KEY ("generatedAppId") REFERENCES "GeneratedApp" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS "AppIteration_generatedAppId_idx" ON "AppIteration"("generatedAppId")
  `);

  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "iterationCount" INTEGER NOT NULL DEFAULT 0
  `);

  console.log("Done! AppIteration table created and iterationCount column added.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

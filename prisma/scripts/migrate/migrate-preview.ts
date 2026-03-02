import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding preview fields to GeneratedApp...");

  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "previewFlyAppId" TEXT
  `);
  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "previewFlyUrl" TEXT
  `);
  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "previewExpiresAt" DATETIME
  `);
  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "screenshot" TEXT
  `);

  console.log("Done! Preview fields added to GeneratedApp.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

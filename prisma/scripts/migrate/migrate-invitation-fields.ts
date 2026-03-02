import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding name and title columns to Invitation table...");

  await client.execute(`
    ALTER TABLE "Invitation" ADD COLUMN "name" TEXT
  `);

  await client.execute(`
    ALTER TABLE "Invitation" ADD COLUMN "title" TEXT
  `);

  console.log("Done! name and title columns added to Invitation.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

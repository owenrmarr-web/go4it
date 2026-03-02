import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Adding businessDescription column to User table...');

  await client.execute(`
    ALTER TABLE "User" ADD COLUMN "businessDescription" TEXT
  `);

  console.log("Done! businessDescription column added to User.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

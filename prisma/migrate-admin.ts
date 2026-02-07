import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding isAdmin column to User table in Turso...");

  await client.execute(`
    ALTER TABLE "User" ADD COLUMN "isAdmin" INTEGER NOT NULL DEFAULT 0
  `);

  console.log("Done! isAdmin column added.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

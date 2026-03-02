import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding currentDetail field to GeneratedApp...");

  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "currentDetail" TEXT
  `);

  console.log("Done! currentDetail field added.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

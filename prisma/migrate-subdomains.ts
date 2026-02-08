import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding subdomain column to OrgApp table...");

  await client.execute(`
    ALTER TABLE "OrgApp" ADD COLUMN "subdomain" TEXT
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OrgApp_subdomain_key" ON "OrgApp"("subdomain")
  `);

  console.log("Done! subdomain column added with unique index.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

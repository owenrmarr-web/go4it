import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding version control fields...");

  // GeneratedApp: marketplaceVersion, forkedFromId
  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "marketplaceVersion" INTEGER NOT NULL DEFAULT 1
  `);
  await client.execute(`
    ALTER TABLE "GeneratedApp" ADD COLUMN "forkedFromId" TEXT
  `);

  // OrgApp: version tracking fields
  await client.execute(`
    ALTER TABLE "OrgApp" ADD COLUMN "deployedMarketplaceVersion" INTEGER
  `);
  await client.execute(`
    ALTER TABLE "OrgApp" ADD COLUMN "deployedOrgVersion" INTEGER
  `);
  await client.execute(`
    ALTER TABLE "OrgApp" ADD COLUMN "orgIterationCount" INTEGER NOT NULL DEFAULT 0
  `);
  await client.execute(`
    ALTER TABLE "OrgApp" ADD COLUMN "orgSourceDir" TEXT
  `);

  console.log("Done! Version control fields added.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

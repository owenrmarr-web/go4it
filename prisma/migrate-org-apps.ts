import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Creating OrgApp table...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "OrgApp" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "appId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ADDED',
      "flyAppId" TEXT,
      "flyUrl" TEXT,
      "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deployedAt" DATETIME,
      CONSTRAINT "OrgApp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OrgApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OrgApp_organizationId_appId_key" ON "OrgApp"("organizationId", "appId")
  `);

  console.log("Creating OrgAppMember table...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "OrgAppMember" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orgAppId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrgAppMember_orgAppId_fkey" FOREIGN KEY ("orgAppId") REFERENCES "OrgApp" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OrgAppMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OrgAppMember_orgAppId_userId_key" ON "OrgAppMember"("orgAppId", "userId")
  `);

  console.log("Done! OrgApp + OrgAppMember tables created.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

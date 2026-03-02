import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "AppUpdate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "generatedAppId" TEXT NOT NULL,
      "version" INTEGER NOT NULL,
      "summary" TEXT NOT NULL,
      "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AppUpdate_generatedAppId_fkey" FOREIGN KEY ("generatedAppId") REFERENCES "GeneratedApp" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "AppUpdate_generatedAppId_idx" ON "AppUpdate" ("generatedAppId")`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`OK: ${sql.slice(0, 60)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        console.log(`SKIP (already exists): ${sql.slice(0, 60)}...`);
      } else {
        throw e;
      }
    }
  }

  console.log("Migration complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

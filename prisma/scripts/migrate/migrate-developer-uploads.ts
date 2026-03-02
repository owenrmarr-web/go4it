import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Add developer upload columns to GeneratedApp
  const statements = [
    `ALTER TABLE GeneratedApp ADD COLUMN source TEXT DEFAULT 'generated'`,
    `ALTER TABLE GeneratedApp ADD COLUMN uploadBlobUrl TEXT`,
    `ALTER TABLE GeneratedApp ADD COLUMN manifestJson TEXT`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`OK: ${sql}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column")) {
        console.log(`SKIP (already exists): ${sql}`);
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

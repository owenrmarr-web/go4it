import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Add deployedInfraVersion column
  const statements = [
    `ALTER TABLE OrgApp ADD COLUMN deployedInfraVersion INTEGER`,
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

  // Backfill: all RUNNING apps were deployed with upgradeTemplateInfra which
  // stamps GO4IT_TEMPLATE_VERSION = 2, so they are at infra version 2
  const result = await prisma.$executeRawUnsafe(
    `UPDATE OrgApp SET deployedInfraVersion = 2 WHERE status = 'RUNNING' AND deployedInfraVersion IS NULL`
  );
  console.log(`Backfilled RUNNING apps to infra version 2 (${result} rows)`);

  console.log("Migration complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

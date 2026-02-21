import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Add authSecret column to OrgApp table (idempotent — ALTER TABLE ADD COLUMN is a no-op if column exists in SQLite)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "OrgApp" ADD COLUMN "authSecret" TEXT`
  );
  console.log("Added authSecret column to OrgApp table.");
}

main().catch((err) => {
  // SQLite returns "duplicate column name" if already exists — that's fine
  if (String(err).includes("duplicate column")) {
    console.log("authSecret column already exists, skipping.");
  } else {
    console.error(err);
    process.exit(1);
  }
}).finally(() => prisma.$disconnect());

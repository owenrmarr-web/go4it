import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL || "";
const tursoUrl = dbUrl.includes("libsql") ? dbUrl : "libsql://go4it-owenrmarr.aws-us-west-2.turso.io";

const adapter = new PrismaLibSql({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Add previewUrl and screenshot columns to App
  const statements = [
    `ALTER TABLE App ADD COLUMN previewUrl TEXT`,
    `ALTER TABLE App ADD COLUMN screenshot TEXT`,
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

  // Backfill: copy previewFlyUrl and screenshot from linked GeneratedApp records
  const backfillResult = await prisma.$executeRawUnsafe(`
    UPDATE App
    SET previewUrl = (
      SELECT ga.previewFlyUrl FROM GeneratedApp ga WHERE ga.appId = App.id
    ),
    screenshot = (
      SELECT ga.screenshot FROM GeneratedApp ga WHERE ga.appId = App.id
    )
    WHERE EXISTS (SELECT 1 FROM GeneratedApp ga WHERE ga.appId = App.id)
  `);
  console.log(`Backfill complete (${backfillResult} rows updated).`);

  console.log("Migration complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

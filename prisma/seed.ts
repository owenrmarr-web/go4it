import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear seeded placeholder apps (keeps generated+published apps intact)
  const deleted = await prisma.app.deleteMany({
    where: { generatedApp: { is: null } },
  });
  console.log(`Removed ${deleted.count} placeholder apps.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

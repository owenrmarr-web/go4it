import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      email: "admin@go4it.live",
      emailVerified: null,
    },
    data: {
      emailVerified: new Date(),
    },
  });
  console.log(`Updated ${result.count} admin user(s) with emailVerified.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

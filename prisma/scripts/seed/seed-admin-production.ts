import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hash("Chill204$$", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {
      name: "GO4IT Admin",
      username: "admin",
      password,
      isAdmin: true,
      emailVerified: new Date(),
    },
    create: {
      email: "admin@go4it.live",
      name: "GO4IT Admin",
      username: "admin",
      password,
      isAdmin: true,
      emailVerified: new Date(),
    },
  });

  console.log(`Admin user upserted: ${user.id} (${user.email})`);
  console.log(`  isAdmin: ${user.isAdmin}`);
  console.log(`  username: ${user.username}`);
  console.log(`  emailVerified: ${user.emailVerified}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

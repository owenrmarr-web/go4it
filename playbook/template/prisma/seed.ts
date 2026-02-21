import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash(process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(), 12);
  await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      name: "GO4IT Admin",
      password,
      role: "admin",
    },
  });
  console.log("Seeded admin user.");

  // App-specific seed data will be added by the AI builder.
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) {
    console.log("No GO4IT_TEAM_MEMBERS set, skipping.");
    return;
  }

  const members: { name: string; email: string }[] = JSON.parse(raw);
  const password = await bcrypt.hash("go4it2026", 12);

  for (const member of members) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name },
      create: { email: member.email, name: member.name, password },
    });
    console.log(`Provisioned: ${member.name} (${member.email})`);
  }
  console.log(`Done — ${members.length} users provisioned.`);
}

main().finally(() => prisma.$disconnect());

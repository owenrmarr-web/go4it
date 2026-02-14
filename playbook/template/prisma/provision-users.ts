import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash("go4it2026", 12);

  // Always provision GO4IT admin account
  await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: { name: "GO4IT Admin" },
    create: { email: "admin@go4it.live", name: "GO4IT Admin", password: defaultPassword },
  });
  console.log("Provisioned: GO4IT Admin (admin@go4it.live)");

  // Provision team members if set
  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) {
    console.log("No GO4IT_TEAM_MEMBERS set, skipping team provisioning.");
    return;
  }

  const members: { name: string; email: string; passwordHash?: string }[] = JSON.parse(raw);

  for (const member of members) {
    // Use the member's platform password hash if provided, otherwise use default
    const password = member.passwordHash || defaultPassword;
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, password },
      create: { email: member.email, name: member.name, password },
    });
    console.log(`Provisioned: ${member.name} (${member.email})${member.passwordHash ? " [platform credentials]" : ""}`);
  }
  console.log(`Done — ${members.length + 1} users provisioned.`);
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.GO4IT_ADMIN_PASSWORD;
  const adminHash = adminPassword
    ? await bcrypt.hash(adminPassword, 12)
    : await bcrypt.hash(crypto.randomUUID(), 12);

  // Always provision GO4IT admin account
  await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: { name: "GO4IT Admin", password: adminHash, role: "admin" },
    create: { email: "admin@go4it.live", name: "GO4IT Admin", password: adminHash, role: "admin" },
  });
  console.log("Provisioned: GO4IT Admin (admin@go4it.live)");

  // Provision team members if set
  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) {
    console.log("No GO4IT_TEAM_MEMBERS set, skipping team provisioning.");
    return;
  }

  const members: {
    name: string; email: string; role?: string; passwordHash?: string; assigned?: boolean;
    username?: string; title?: string; image?: string; profileColor?: string; profileEmoji?: string;
  }[] = JSON.parse(raw);

  for (const member of members) {
    const isAssigned = member.assigned !== false; // backward compat: missing = assigned
    const password = isAssigned
      ? (member.passwordHash || adminHash)
      : await bcrypt.hash(crypto.randomUUID(), 12); // random unusable password
    const role = member.role || "member";
    const profileFields = {
      username: member.username || null,
      title: member.title || null,
      image: member.image || null,
      profileColor: member.profileColor || null,
      profileEmoji: member.profileEmoji || null,
    };
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, password, isAssigned, ...profileFields },
      create: { email: member.email, name: member.name, password, isAssigned, role, ...profileFields },
    });
    console.log(`Provisioned: ${member.name} (${member.email}) [${role}]${isAssigned ? "" : " [unassigned]"}${member.passwordHash ? " [platform credentials]" : ""}`);
  }
  console.log(`Done — ${members.length + 1} users provisioned.`);
}

main().finally(() => prisma.$disconnect());

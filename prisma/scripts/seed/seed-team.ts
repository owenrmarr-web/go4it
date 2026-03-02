import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

const teamMembers = [
  { name: "Alice", email: "alice@zenith.space", role: "OWNER" as const },
  { name: "Bob", email: "bob@zenith.space", role: "ADMIN" as const },
  { name: "Carol", email: "carol@zenith.space", role: "MEMBER" as const },
  { name: "Dave", email: "dave@zenith.space", role: "MEMBER" as const },
  { name: "Eve", email: "eve@zenith.space", role: "MEMBER" as const },
];

async function main() {
  const password = await bcrypt.hash("password123", 12);

  // Upsert users
  const users = [];
  for (const member of teamMembers) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, password },
      create: {
        name: member.name,
        email: member.email,
        password,
        companyName: "Zenith Space",
      },
    });
    users.push({ ...user, role: member.role });
    console.log(`  User: ${member.name} (${member.email})`);
  }

  // Upsert organization
  let org = await prisma.organization.findUnique({
    where: { slug: "zenith-space" },
  });

  if (org) {
    // Clear existing members to re-seed cleanly
    await prisma.organizationMember.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`  Org "Zenith Space" already exists — refreshing members`);
  } else {
    org = await prisma.organization.create({
      data: {
        name: "Zenith Space",
        slug: "zenith-space",
      },
    });
    console.log(`  Created org: Zenith Space (zenith-space.go4it.live)`);
  }

  // Add members
  for (const user of users) {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: user.role,
      },
    });
    console.log(`  Added ${user.name} as ${user.role}`);
  }

  console.log(`\nDone! Zenith Space team seeded with ${users.length} members.`);
  console.log(`Login with any email above + password: password123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

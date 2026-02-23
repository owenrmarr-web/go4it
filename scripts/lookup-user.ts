import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: "libsql://go4it-owenrmarr.aws-us-west-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "amtuko@gmail.com" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      organizations: { select: { organizationId: true, role: true, organization: { select: { name: true, slug: true } } } },
      generatedApps: { select: { id: true, title: true } },
      interactions: { select: { id: true } },
      orgAppMembers: { select: { id: true, orgAppId: true } },
    },
  });
  console.log("User:", JSON.stringify(user, null, 2));

  const org = await prisma.organization.findFirst({
    where: { name: "Zenith Space Solutions" },
    select: {
      id: true, name: true, slug: true,
      apps: { select: { id: true, appId: true, status: true, flyAppId: true } },
      members: { select: { id: true, userId: true, role: true, user: { select: { email: true } } } },
      invitations: { select: { id: true, email: true, status: true } },
    },
  });
  console.log("\nOrg:", JSON.stringify(org, null, 2));

  const tokens = await prisma.verificationToken.findMany({
    where: { identifier: "amtuko@gmail.com" },
  });
  console.log("\nTokens:", tokens.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

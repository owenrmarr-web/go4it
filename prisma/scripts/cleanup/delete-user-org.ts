import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: "libsql://go4it-owenrmarr.aws-us-west-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Delete org (cascades to OrganizationMember)
  const org = await prisma.organization.delete({
    where: { id: "cmls8xxzp000004jh2jqrsfyh" },
  });
  console.log("Deleted org:", org.name);

  // Delete user
  const user = await prisma.user.delete({
    where: { id: "cmlrkzij5000004k0s5h3hycg" },
  });
  console.log("Deleted user:", user.email);

  // Verify clean
  const checkUser = await prisma.user.findUnique({ where: { email: "amtuko@gmail.com" } });
  const checkOrg = await prisma.organization.findFirst({ where: { name: "Zenith Space Solutions" } });
  console.log("\nVerify user gone:", checkUser === null ? "YES" : "NO");
  console.log("Verify org gone:", checkOrg === null ? "YES" : "NO");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

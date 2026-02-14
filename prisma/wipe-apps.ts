import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Delete in order to respect foreign key constraints
  const orgAppMembers = await prisma.orgAppMember.deleteMany();
  console.log(`Deleted ${orgAppMembers.count} OrgAppMember records.`);

  const orgApps = await prisma.orgApp.deleteMany();
  console.log(`Deleted ${orgApps.count} OrgApp records.`);

  const appIterations = await prisma.appIteration.deleteMany();
  console.log(`Deleted ${appIterations.count} AppIteration records.`);

  const userInteractions = await prisma.userInteraction.deleteMany();
  console.log(`Deleted ${userInteractions.count} UserInteraction records.`);

  const generatedApps = await prisma.generatedApp.deleteMany();
  console.log(`Deleted ${generatedApps.count} GeneratedApp records.`);

  const apps = await prisma.app.deleteMany();
  console.log(`Deleted ${apps.count} App records.`);

  console.log("Done — all app data wiped.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

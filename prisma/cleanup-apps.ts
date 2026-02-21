import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

// Keep only the new messaging app
const KEEP_APP_ID = "cmlo9mivd0000jdr2hwm3mk9a";
const KEEP_GEN_ID = "cmlo984s0000004icoado60hc";
const KEEP_ORGAPP_ID = "cmlo9mizv0001jdr2igl93s0k";

async function main() {
  // Delete OrgAppMembers for OrgApps we're removing
  const orgAppMembers = await prisma.orgAppMember.deleteMany({
    where: { orgAppId: { not: KEEP_ORGAPP_ID } },
  });
  console.log(`Deleted ${orgAppMembers.count} OrgAppMember records.`);

  // Delete OrgApps except the keeper
  const orgApps = await prisma.orgApp.deleteMany({
    where: { id: { not: KEEP_ORGAPP_ID } },
  });
  console.log(`Deleted ${orgApps.count} OrgApp records.`);

  // Delete all AppIterations for GeneratedApps we're removing
  const appIterations = await prisma.appIteration.deleteMany({
    where: { generatedAppId: { not: KEEP_GEN_ID } },
  });
  console.log(`Deleted ${appIterations.count} AppIteration records.`);

  // Delete all UserInteractions for Apps we're removing
  const userInteractions = await prisma.userInteraction.deleteMany({
    where: { appId: { not: KEEP_APP_ID } },
  });
  console.log(`Deleted ${userInteractions.count} UserInteraction records.`);

  // Delete GeneratedApps except the keeper
  const generatedApps = await prisma.generatedApp.deleteMany({
    where: { id: { not: KEEP_GEN_ID } },
  });
  console.log(`Deleted ${generatedApps.count} GeneratedApp records.`);

  // Delete Apps except the keeper
  const apps = await prisma.app.deleteMany({
    where: { id: { not: KEEP_APP_ID } },
  });
  console.log(`Deleted ${apps.count} App records.`);

  console.log("\nDone — kept only the new messaging app.");

  // Verify
  const remainingApps = await prisma.app.findMany({ select: { id: true, title: true } });
  console.log("\nRemaining Apps:", remainingApps);
  const remainingGen = await prisma.generatedApp.findMany({ select: { id: true, title: true, status: true } });
  console.log("Remaining GeneratedApps:", remainingGen);
  const remainingOrg = await prisma.orgApp.findMany({ select: { id: true, appId: true, flyAppId: true, status: true } });
  console.log("Remaining OrgApps:", remainingOrg);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const apps = await prisma.app.findMany({ select: { id: true, title: true, isPublic: true } });
  console.log("=== Apps ===", apps.length);
  for (const a of apps) console.log(JSON.stringify(a));

  const genApps = await prisma.generatedApp.findMany({ select: { id: true, title: true, status: true, appId: true, previewFlyAppId: true } });
  console.log("\n=== GeneratedApps ===", genApps.length);
  for (const g of genApps) console.log(JSON.stringify(g));

  const orgApps = await prisma.orgApp.findMany({ select: { id: true, appId: true, flyAppId: true, flyUrl: true, status: true } });
  console.log("\n=== OrgApps ===", orgApps.length);
  for (const o of orgApps) console.log(JSON.stringify(o));

  const interactions = await prisma.userInteraction.findMany({ select: { id: true, appId: true, type: true } });
  console.log("\n=== UserInteractions ===", interactions.length);
  for (const i of interactions) console.log(JSON.stringify(i));
}

main().catch(console.error).finally(() => prisma.$disconnect());

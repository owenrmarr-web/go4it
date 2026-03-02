import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const apps = await prisma.app.findMany({
    where: { isGoSuite: true },
    select: {
      id: true,
      title: true,
      icon: true,
      category: true,
      generatedApp: { select: { sourceDir: true } },
      orgApps: {
        where: { status: "RUNNING" },
        select: {
          flyAppId: true,
          flyUrl: true,
          deployedInfraVersion: true,
          organization: { select: { slug: true } },
        },
      },
    },
  });

  for (const app of apps) {
    console.log(`${app.icon} ${app.title} (${app.category})`);
    console.log(`  sourceDir: ${app.generatedApp?.sourceDir ?? "N/A"}`);
    for (const oa of app.orgApps) {
      console.log(`  deployed: ${oa.flyAppId} (${oa.organization.slug}) infra=v${oa.deployedInfraVersion ?? "?"} url=${oa.flyUrl}`);
    }
    if (app.orgApps.length === 0) console.log("  no running deployments");
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

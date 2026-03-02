import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all deployed apps with .go4it.live URLs
  const orgApps = await prisma.orgApp.findMany({
    where: {
      flyUrl: { not: null },
      flyAppId: { not: null },
    },
  });

  console.log(`Found ${orgApps.length} deployed app(s)`);

  for (const app of orgApps) {
    if (app.flyUrl?.includes(".go4it.live")) {
      const newUrl = `https://${app.flyAppId}.fly.dev`;
      console.log(`  ${app.flyUrl} → ${newUrl}`);
      await prisma.orgApp.update({
        where: { id: app.id },
        data: { flyUrl: newUrl },
      });
    } else {
      console.log(`  ${app.flyUrl} — already .fly.dev, skipping`);
    }
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

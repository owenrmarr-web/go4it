import { readFileSync } from "fs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import path from "path";

// Load .env manually since this runs outside Next.js (don't overwrite explicit env vars)
const envFile = readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all GeneratedApps linked to a published App where titles differ
  const genApps = await prisma.generatedApp.findMany({
    where: { appId: { not: null } },
    select: {
      id: true,
      title: true,
      app: { select: { id: true, title: true } },
    },
  });

  let updated = 0;
  for (const ga of genApps) {
    if (ga.app && ga.title !== ga.app.title) {
      console.log(`${ga.id}: "${ga.title}" → "${ga.app.title}"`);
      await prisma.generatedApp.update({
        where: { id: ga.id },
        data: { title: ga.app.title },
      });
      updated++;
    }
  }

  console.log(`\nDone! Updated ${updated} of ${genApps.length} GeneratedApp titles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

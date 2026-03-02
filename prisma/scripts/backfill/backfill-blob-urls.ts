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

const BUILDER_URL = process.env.BUILDER_URL!;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY!;

async function main() {
  if (!BUILDER_URL || !BUILDER_API_KEY) {
    console.error("BUILDER_URL and BUILDER_API_KEY must be set");
    process.exit(1);
  }

  // Find all GeneratedApps with no blob URL that have a sourceDir
  const apps = await prisma.generatedApp.findMany({
    where: {
      uploadBlobUrl: null,
      sourceDir: { not: null },
      status: { in: ["COMPLETE", "GENERATING"] },
    },
    select: {
      id: true,
      title: true,
      sourceDir: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${apps.length} apps without blob URLs\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const app of apps) {
    console.log(`[${app.id}] "${app.title}" — sourceDir: ${app.sourceDir}`);

    try {
      const res = await fetch(`${BUILDER_URL}/upload-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BUILDER_API_KEY}`,
        },
        body: JSON.stringify({ generationId: app.id }),
      });

      const data = (await res.json()) as { status: string; url?: string; error?: string };

      if (data.status === "already_uploaded") {
        console.log(`  Already uploaded: ${data.url}\n`);
        skipped++;
      } else if (data.status === "uploaded") {
        console.log(`  Uploaded: ${data.url}\n`);
        uploaded++;
      } else {
        console.error(`  Failed: ${data.error}\n`);
        failed++;
      }
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : err}\n`);
      failed++;
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { readFileSync } from "fs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import path from "path";

// Load .env manually since this runs outside Next.js
const envFile = readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
  if (match) process.env[match[1]] = match[2];
}

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the M&A Deal Tracker marketplace App
  const app = await prisma.app.findFirst({
    where: { title: "M&A Deal Tracker" },
  });

  if (!app) {
    console.error("M&A Deal Tracker not found in marketplace. Run seed first.");
    process.exit(1);
  }

  console.log(`Found marketplace App: ${app.title} (${app.id})`);

  // Check if a GeneratedApp already links to it
  const existing = await prisma.generatedApp.findFirst({
    where: { appId: app.id },
  });

  if (existing) {
    console.log(`Already linked: GeneratedApp ${existing.id} → sourceDir: ${existing.sourceDir}`);
    return;
  }

  // Find a user to use as the creator
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No users found. Run seed-team.ts first.");
    process.exit(1);
  }

  // Create the GeneratedApp record
  const sourceDir = path.resolve(
    process.cwd(),
    "apps",
    "cmlbsxi7q0000svzoak4xyj02"
  );

  const generatedApp = await prisma.generatedApp.create({
    data: {
      prompt: "Build an M&A deal tracker CRM",
      title: "M&A Deal Tracker",
      description: app.description,
      sourceDir,
      status: "COMPLETE",
      createdById: user.id,
      appId: app.id,
    },
  });

  console.log(`Created GeneratedApp: ${generatedApp.id}`);
  console.log(`  → appId: ${app.id}`);
  console.log(`  → sourceDir: ${sourceDir}`);
  console.log("Done! The M&A Deal Tracker is now linked and deployable.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

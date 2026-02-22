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
  const AMIT_EMAIL = "amtuko@gmail.com";
  const APP_TITLE = "Rent A Field";

  // 1. Find Amit's user record
  const amit = await prisma.user.findUnique({
    where: { email: AMIT_EMAIL },
  });

  if (!amit) {
    console.error(`User not found: ${AMIT_EMAIL}`);
    process.exit(1);
  }

  console.log(`Found user: ${amit.name} (${amit.id}), username: ${amit.username || "NONE"}`);

  // 2. Set username if missing
  if (!amit.username) {
    const baseUsername = (amit.name || "user")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 20) || "user";

    let username = baseUsername;
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existing) {
      username = `${username}_${Math.random().toString(36).substring(2, 6)}`;
    }

    await prisma.user.update({
      where: { id: amit.id },
      data: { username },
    });
    console.log(`Set username: @${username}`);
  } else {
    console.log(`Username already set: @${amit.username}`);
  }

  // Refetch to get the updated username
  const updatedAmit = await prisma.user.findUnique({
    where: { id: amit.id },
    select: { id: true, username: true, name: true },
  });

  // 3. Find the "Rent A Field" App in the marketplace
  const app = await prisma.app.findFirst({
    where: { title: APP_TITLE },
  });

  if (!app) {
    console.error(`App not found in marketplace: "${APP_TITLE}"`);
    // List all apps to help debug
    const allApps = await prisma.app.findMany({ select: { id: true, title: true, author: true } });
    console.log("All marketplace apps:", allApps);
    process.exit(1);
  }

  console.log(`Found marketplace App: "${app.title}" (${app.id}), current author: "${app.author}"`);

  // 4. Update the App author to Amit's username
  const authorDisplay = updatedAmit?.username
    ? `@${updatedAmit.username}`
    : updatedAmit?.name || AMIT_EMAIL;

  await prisma.app.update({
    where: { id: app.id },
    data: { author: authorDisplay },
  });
  console.log(`Updated App author to: "${authorDisplay}"`);

  // 5. Check if GeneratedApp is already linked
  const linkedGen = await prisma.generatedApp.findFirst({
    where: { appId: app.id },
  });

  if (linkedGen) {
    console.log(`GeneratedApp already linked: ${linkedGen.id}, createdById: ${linkedGen.createdById}`);
    if (linkedGen.createdById !== amit.id) {
      await prisma.generatedApp.update({
        where: { id: linkedGen.id },
        data: { createdById: amit.id },
      });
      console.log(`Updated GeneratedApp createdById to Amit's ID`);
    }
  } else {
    // Find a GeneratedApp created by Amit that might not be linked
    const amitGenApps = await prisma.generatedApp.findMany({
      where: { createdById: amit.id },
      select: { id: true, title: true, appId: true, status: true },
    });
    console.log(`Amit's GeneratedApps:`, amitGenApps);

    if (amitGenApps.length === 0) {
      console.log("No GeneratedApp found for Amit — creating one linked to the marketplace App");
      const generatedApp = await prisma.generatedApp.create({
        data: {
          prompt: "Field rental management app",
          title: APP_TITLE,
          description: app.description,
          status: "COMPLETE",
          createdById: amit.id,
          appId: app.id,
        },
      });
      console.log(`Created GeneratedApp: ${generatedApp.id} → linked to App ${app.id}`);
    } else {
      // Link the first unlinked GeneratedApp to this App
      const unlinked = amitGenApps.find((g) => !g.appId);
      if (unlinked) {
        await prisma.generatedApp.update({
          where: { id: unlinked.id },
          data: { appId: app.id },
        });
        console.log(`Linked GeneratedApp ${unlinked.id} to App ${app.id}`);
      } else {
        console.log("All of Amit's GeneratedApps are already linked to other Apps");
      }
    }
  }

  console.log("\nDone! Amit's app should now appear in his 'Apps I've Created' list.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

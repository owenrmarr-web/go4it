// Generic ownership transfer script — runs ON the Fly machine
// Updates all tables' userId from admin@go4it.live to owenmarr@umich.edu
// Tables are passed via TABLES env var (comma-separated)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@go4it.live" } });
  const owner = await prisma.user.findFirst({ where: { email: "owenmarr@umich.edu" } });
  if (!admin) { console.log("Admin user not found"); return; }
  if (!owner) { console.log("Owner user not found - team sync may not have run"); return; }

  console.log("Admin:", admin.id, "-> Owner:", owner.id);

  // Use raw SQL to update all tables - works regardless of Prisma model names
  const tables = (process.env.TABLES || "").split(",").filter(Boolean);
  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "userId" = ? WHERE "userId" = ?`,
        owner.id, admin.id
      );
      console.log("  " + table + ": " + result + " records");
    } catch (err) {
      // Try staffUserId for EmployeeProfile
      try {
        const result = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "staffUserId" = ? WHERE "staffUserId" = ?`,
          owner.id, admin.id
        );
        console.log("  " + table + " (staffUserId): " + result + " records");
      } catch {
        console.log("  " + table + ": skipped (" + err.message.slice(0, 60) + ")");
      }
    }
  }
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

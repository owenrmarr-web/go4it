// Transfer seed data ownership from admin@go4it.live to the actual org owner
// Runs via: fly ssh console -a <app> -C "node /tmp/transfer.js"
// This script generates the node commands to run on each Fly machine

const FLYCTL = "/Users/owenmarr/.fly/bin/flyctl";

const apps: Record<string, { flyAppId: string; tables: string[] }> = {
  GoCRM: {
    flyAppId: "go4it-space-gods-inc-cmmdwif2",
    tables: ["Contact", "Company", "Deal", "Activity"],
  },
  GoInvoice: {
    flyAppId: "go4it-space-gods-inc-cmmdwk90",
    tables: ["Invoice", "InvoiceItem", "Estimate", "EstimateItem", "Payment", "Client"],
  },
  GoProject: {
    flyAppId: "go4it-space-gods-inc-cmm48cog",
    tables: ["Project", "Task", "Milestone"],
  },
  GoSupport: {
    flyAppId: "go4it-space-gods-inc-cmmdw3mc",
    tables: ["Ticket", "TicketComment", "KBArticle", "KBCategory"],
  },
  GoInventory: {
    flyAppId: "go4it-space-gods-inc-cmmb73i0",
    tables: ["Category", "Supplier", "Product", "PurchaseOrder", "PurchaseOrderItem"],
  },
  GoHR: {
    flyAppId: "go4it-space-gods-inc-cmmb9pcf",
    tables: ["Department", "EmployeeProfile", "Announcement"],
  },
};

const OWNER_EMAIL = "owenmarr@umich.edu";
const ADMIN_EMAIL = "admin@go4it.live";

async function transferApp(appName: string, config: typeof apps[string]) {
  console.log(`\n=== ${appName} (${config.flyAppId}) ===`);

  // Build a node script that:
  // 1. Finds both users
  // 2. Updates all tables to use the owner's userId
  const tableUpdates = config.tables
    .map((t) => {
      const model = t.charAt(0).toLowerCase() + t.slice(1);
      return `
    const ${model}Count = await prisma.${model}.updateMany({ where: { userId: adminId }, data: { userId: ownerId } });
    console.log('  ${t}:', ${model}Count.count, 'records');`;
    })
    .join("\n");

  const script = `
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "${ADMIN_EMAIL}" } });
  const owner = await prisma.user.findFirst({ where: { email: "${OWNER_EMAIL}" } });
  if (!admin) { console.log("Admin not found"); return; }
  if (!owner) { console.log("Owner not found - team sync may not have run"); return; }
  const adminId = admin.id;
  const ownerId = owner.id;
  console.log("Admin:", adminId, "-> Owner:", ownerId);
  ${tableUpdates}
  console.log("Done!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
`.trim();

  const { execSync } = await import("child_process");
  try {
    const result = execSync(
      `${FLYCTL} ssh console -a ${config.flyAppId} -C "node -e '${script.replace(/'/g, "'\\''")}'"`  ,
      { encoding: "utf-8", timeout: 30_000 }
    );
    console.log(result);
  } catch (err: unknown) {
    const error = err as { stderr?: string; stdout?: string };
    console.error(`  FAILED:`, error.stderr || error.stdout);
  }
}

async function main() {
  for (const [name, config] of Object.entries(apps)) {
    await transferApp(name, config);
  }
}

main().catch(console.error);

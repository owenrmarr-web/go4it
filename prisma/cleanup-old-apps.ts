import "dotenv/config";
import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL || "";
const tursoUrl = dbUrl.includes("libsql") ? dbUrl : "libsql://go4it-owenrmarr.aws-us-west-2.turso.io";

const client = createClient({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Find GoChat and GoProject GeneratedApp IDs (keep these)
  const keepers = await client.execute(
    "SELECT id, title, appId FROM GeneratedApp WHERE title IN ('GoChat', 'GoProject')"
  );
  console.log("=== Keeping ===");
  const keepGenIds: string[] = [];
  const keepAppIds: string[] = [];
  for (const row of keepers.rows) {
    console.log(`  ${row.title} | genId=${row.id} | appId=${row.appId}`);
    keepGenIds.push(row.id as string);
    if (row.appId) keepAppIds.push(row.appId as string);
  }

  if (keepGenIds.length !== 2) {
    console.error("Expected 2 keepers (GoChat, GoProject), found", keepGenIds.length);
    return;
  }

  // Show what will be deleted
  const toDeleteApps = await client.execute(
    `SELECT id, title FROM App WHERE id NOT IN (${keepAppIds.map(() => "?").join(",")})`,
    keepAppIds
  );
  console.log(`\n=== Deleting ${toDeleteApps.rows.length} Apps ===`);
  for (const row of toDeleteApps.rows) {
    console.log(`  ${row.title} (${row.id})`);
  }

  const toDeleteGens = await client.execute(
    `SELECT id, title, status, source FROM GeneratedApp WHERE id NOT IN (${keepGenIds.map(() => "?").join(",")})`,
    keepGenIds
  );
  console.log(`\n=== Deleting ${toDeleteGens.rows.length} GeneratedApps ===`);
  for (const row of toDeleteGens.rows) {
    console.log(`  ${row.title} | ${row.status} | ${row.source} (${row.id})`);
  }

  // Check for OrgApps referencing apps we'll delete
  const orgApps = await client.execute("SELECT id, appId, flyAppId, status FROM OrgApp");
  console.log(`\n=== OrgApps (${orgApps.rows.length} total) ===`);
  for (const row of orgApps.rows) {
    const isKeeper = keepAppIds.includes(row.appId as string);
    console.log(`  appId=${row.appId} | fly=${row.flyAppId || "none"} | status=${row.status} | ${isKeeper ? "KEEP" : "DELETE"}`);
  }

  // Check for UserInteractions
  const interactions = await client.execute("SELECT COUNT(*) as cnt FROM UserInteraction");
  console.log(`\n=== UserInteractions: ${interactions.rows[0].cnt} total ===`);

  console.log("\n--- DRY RUN COMPLETE ---");
  console.log("Pass --execute to actually delete");

  if (!process.argv.includes("--execute")) return;

  console.log("\n=== EXECUTING CLEANUP ===");

  // Delete in order: OrgAppMembers → OrgApps → UserInteractions → Apps (cascade) → GeneratedApps
  // Apps that are NOT GoChat/GoProject
  const deleteAppIds = toDeleteApps.rows.map((r) => r.id as string);
  const deleteGenIds = toDeleteGens.rows.map((r) => r.id as string);

  if (deleteAppIds.length > 0) {
    // Delete OrgAppMembers for OrgApps linked to deleted apps
    await client.execute(
      `DELETE FROM OrgAppMember WHERE orgAppId IN (SELECT id FROM OrgApp WHERE appId IN (${deleteAppIds.map(() => "?").join(",")}))`,
      deleteAppIds
    );
    console.log("Deleted OrgAppMembers for old apps");

    // Delete OrgApps for deleted apps
    await client.execute(
      `DELETE FROM OrgApp WHERE appId IN (${deleteAppIds.map(() => "?").join(",")})`,
      deleteAppIds
    );
    console.log("Deleted OrgApps for old apps");

    // Delete UserInteractions for deleted apps
    await client.execute(
      `DELETE FROM UserInteraction WHERE appId IN (${deleteAppIds.map(() => "?").join(",")})`,
      deleteAppIds
    );
    console.log("Deleted UserInteractions for old apps");

    // Delete Apps
    await client.execute(
      `DELETE FROM App WHERE id IN (${deleteAppIds.map(() => "?").join(",")})`,
      deleteAppIds
    );
    console.log(`Deleted ${deleteAppIds.length} Apps`);
  }

  if (deleteGenIds.length > 0) {
    // Delete AppIterations for deleted GeneratedApps
    await client.execute(
      `DELETE FROM AppIteration WHERE generatedAppId IN (${deleteGenIds.map(() => "?").join(",")})`,
      deleteGenIds
    );
    console.log("Deleted AppIterations for old generations");

    // Delete GeneratedApps
    await client.execute(
      `DELETE FROM GeneratedApp WHERE id IN (${deleteGenIds.map(() => "?").join(",")})`,
      deleteGenIds
    );
    console.log(`Deleted ${deleteGenIds.length} GeneratedApps`);
  }

  // Verify
  const remainingApps = await client.execute("SELECT id, title FROM App");
  console.log(`\n=== Remaining Apps: ${remainingApps.rows.length} ===`);
  for (const row of remainingApps.rows) {
    console.log(`  ${row.title}`);
  }

  const remainingGens = await client.execute("SELECT id, title FROM GeneratedApp");
  console.log(`\n=== Remaining GeneratedApps: ${remainingGens.rows.length} ===`);
  for (const row of remainingGens.rows) {
    console.log(`  ${row.title}`);
  }

  console.log("\nCleanup complete!");
}

main().catch(console.error);

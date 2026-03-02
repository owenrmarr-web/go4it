import "dotenv/config";

/**
 * Trigger redeploy for all Go Suite preview apps via the builder service.
 * This rebuilds preview machines from the latest template source.
 *
 * Usage: DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." BUILDER_API_KEY="..." npx tsx prisma/redeploy-previews.ts
 */

const BUILDER_URL = "https://go4it-builder.fly.dev";
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

if (!BUILDER_API_KEY) {
  console.error("BUILDER_API_KEY is required");
  process.exit(1);
}

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Go Suite apps: maps app title → template directory name under builder/apps/
const GO_SUITE_TEMPLATE_MAP: Record<string, string> = {
  GoCRM: "gocrm",
  GoChat: "gochat",
  GoProject: "project-management",
  GoLedger: "goledger",
};

async function main() {
  // Find Go Suite GeneratedApps with preview machines
  const result = await client.execute(`
    SELECT
      ga.id as generationId,
      ga.previewFlyAppId,
      ga.previewFlyUrl,
      a.title as appTitle
    FROM GeneratedApp ga
    JOIN App a ON ga.appId = a.id
    WHERE ga.previewFlyAppId IS NOT NULL
  `);

  // Filter to Go Suite apps only
  const goSuiteApps = result.rows.filter(
    (row) => GO_SUITE_TEMPLATE_MAP[row.appTitle as string]
  );

  console.log(`Found ${goSuiteApps.length} Go Suite preview apps:\n`);
  for (const row of goSuiteApps) {
    const template = GO_SUITE_TEMPLATE_MAP[row.appTitle as string];
    console.log(`  ${row.appTitle} → ${row.previewFlyAppId} (template: ${template})`);
  }
  console.log();

  // Trigger redeploy for each
  for (const row of goSuiteApps) {
    const templateApp = GO_SUITE_TEMPLATE_MAP[row.appTitle as string];
    const flyAppName = row.previewFlyAppId as string;

    console.log(`Redeploying ${row.appTitle} preview (${flyAppName}) from template ${templateApp}...`);

    try {
      const res = await fetch(`${BUILDER_URL}/redeploy-preview-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BUILDER_API_KEY}`,
        },
        body: JSON.stringify({ templateApp, flyAppName }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  ✓ Accepted: ${JSON.stringify(data)}`);
      } else {
        const error = await res.text();
        console.error(`  ✗ Failed (${res.status}): ${error}`);
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err}`);
    }

    console.log();
  }
}

main().catch(console.error);

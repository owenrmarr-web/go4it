import "dotenv/config";

/**
 * Deploy preview machines for Go Suite apps that don't have one yet.
 * Calls the builder's /redeploy-preview-template endpoint with generationId
 * to create Fly infrastructure and deploy from the template source.
 *
 * Usage:
 *   DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." BUILDER_API_KEY="..." npx tsx prisma/scripts/redeploy/deploy-gosuite-previews.ts
 *   npx tsx prisma/scripts/redeploy/deploy-gosuite-previews.ts --app GoInventory   # single app by title
 */

import { createClient } from "@libsql/client";
import { getGoSuiteTemplateMap } from "./gosuite-map";

const BUILDER_URL = "https://go4it-builder.fly.dev";
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

if (!BUILDER_API_KEY) {
  console.error("BUILDER_API_KEY is required");
  process.exit(1);
}

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const args = process.argv.slice(2);
  const appFilter = args.includes("--app") ? args[args.indexOf("--app") + 1] : null;

  const templateMap = getGoSuiteTemplateMap();

  // Find Go Suite GeneratedApps without preview machines
  const result = await client.execute(`
    SELECT
      ga.id as generationId,
      ga.previewFlyAppId,
      a.title as appTitle,
      a.id as appId
    FROM GeneratedApp ga
    JOIN App a ON ga.appId = a.id
    WHERE a.isGoSuite = 1
  `);

  const apps = result.rows.filter((row) => {
    if (appFilter && row.appTitle !== appFilter) return false;
    return !row.previewFlyAppId; // Only apps without a preview
  });

  if (apps.length === 0) {
    console.log("All Go Suite apps already have preview deployments.");
    if (appFilter) console.log(`(filtered by --app ${appFilter})`);
    return;
  }

  console.log(`Found ${apps.length} Go Suite app(s) needing preview deployment:\n`);
  for (const row of apps) {
    const dirName = templateMap[row.appTitle as string];
    console.log(`  ${row.appTitle} (${dirName || "unknown"}) — generationId: ${row.generationId}`);
  }
  console.log();

  for (const row of apps) {
    const title = row.appTitle as string;
    const generationId = row.generationId as string;
    const dirName = templateMap[title];

    if (!dirName) {
      console.error(`  ✗ ${title}: no template directory found in builder/apps/`);
      continue;
    }

    console.log(`${title}: triggering preview deployment (template: ${dirName})...`);
    try {
      const res = await fetch(`${BUILDER_URL}/redeploy-preview-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BUILDER_API_KEY}`,
        },
        body: JSON.stringify({ templateApp: dirName, generationId }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  ✓ ${title}: ${JSON.stringify(data)}`);
      } else {
        const error = await res.text();
        console.error(`  ✗ ${title}: ${res.status} — ${error}`);
      }
    } catch (err) {
      console.error(`  ✗ ${title}: ${err}`);
    }

    console.log();
  }

  console.log("Preview deployment requests sent. The builder processes them async — check builder logs for progress.");
}

main().catch(console.error);

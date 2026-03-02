import "dotenv/config";
import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL || "";
const tursoUrl = dbUrl.includes("libsql") ? dbUrl : "libsql://go4it-owenrmarr.aws-us-west-2.turso.io";

const client = createClient({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const apps = await client.execute("SELECT id, title, isPublic FROM App");
  console.log("=== Apps ===");
  for (const row of apps.rows) {
    console.log(`${row.title} | public=${row.isPublic}`);
  }

  const gens = await client.execute("SELECT id, title, status, source, appId, previewFlyUrl, previewFlyAppId, screenshot IS NOT NULL as hasScreenshot FROM GeneratedApp");
  console.log("\n=== GeneratedApps ===");
  for (const row of gens.rows) {
    console.log(`${row.title} | status=${row.status} | source=${row.source} | appId=${row.appId ? "linked" : "none"} | previewUrl=${row.previewFlyUrl || "NONE"} | screenshot=${row.hasScreenshot}`);
  }
}

main().catch(console.error);

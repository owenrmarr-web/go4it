import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const result = await client.execute(`
    SELECT a.title, a.icon, a.previewUrl, a.previewFlyAppId,
           a.screenshot IS NOT NULL as hasScreenshot,
           ga.previewFlyAppId as gaPreviewFlyAppId,
           ga.previewFlyUrl, ga.sourceDir
    FROM App a
    LEFT JOIN GeneratedApp ga ON ga.appId = a.id
    WHERE a.isGoSuite = 1
    ORDER BY a.title
  `);

  for (const row of result.rows) {
    const preview = row.previewFlyAppId || row.gaPreviewFlyAppId;
    const url = row.previewUrl || row.previewFlyUrl;
    const status = preview ? "LIVE" : "PENDING";
    console.log(`${row.icon} ${row.title}: ${status}`);
    if (url) console.log(`   URL: ${url}`);
    if (preview) console.log(`   Fly: ${preview}`);
    console.log(`   Screenshot: ${row.hasScreenshot ? "yes" : "no"}`);
    console.log(`   sourceDir: ${row.sourceDir || "n/a"}`);
    console.log();
  }
}

main().catch(console.error);

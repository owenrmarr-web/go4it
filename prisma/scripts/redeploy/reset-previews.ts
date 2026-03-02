import "dotenv/config";
import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL || "";
const tursoUrl = dbUrl.includes("libsql") ? dbUrl : "libsql://go4it-owenrmarr.aws-us-west-2.turso.io";

const client = createClient({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Reset GoChat GeneratedApp
  await client.execute({
    sql: "UPDATE GeneratedApp SET previewFlyAppId = NULL, previewFlyUrl = NULL, previewExpiresAt = NULL, screenshot = NULL WHERE id = ?",
    args: ["cmlspa2mo000004l7maehzdtf"],
  });
  console.log("Reset GoChat GeneratedApp");

  // Reset GoProject GeneratedApp
  await client.execute({
    sql: "UPDATE GeneratedApp SET previewFlyAppId = NULL, previewFlyUrl = NULL, previewExpiresAt = NULL, screenshot = NULL WHERE id = ?",
    args: ["cmlsrqa5g000004kz2y17m28w"],
  });
  console.log("Reset GoProject GeneratedApp");

  // Reset App records
  await client.execute({
    sql: "UPDATE App SET previewUrl = NULL, screenshot = NULL WHERE id IN (?, ?)",
    args: ["cmlspa8k7000004i53c6rueyd", "cmlsrqgyl000004jsba3gg2yn"],
  });
  console.log("Reset App records");

  // Verify
  const result = await client.execute("SELECT id, title, previewFlyAppId, previewFlyUrl, screenshot IS NOT NULL as hasScreenshot FROM GeneratedApp");
  for (const row of result.rows) {
    console.log(`${row.title}: fly=${row.previewFlyAppId || "null"} url=${row.previewFlyUrl || "null"} screenshot=${row.hasScreenshot}`);
  }
}

main().catch(console.error);

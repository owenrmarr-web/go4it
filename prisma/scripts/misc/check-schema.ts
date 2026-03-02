import "dotenv/config";
import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL || "";
const tursoUrl = dbUrl.includes("libsql") ? dbUrl : "libsql://go4it-owenrmarr.aws-us-west-2.turso.io";

const client = createClient({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const result = await client.execute("PRAGMA table_info(App)");
  console.log("=== App table columns ===");
  for (const row of result.rows) {
    console.log(`  ${row.name} (${row.type})`);
  }
}

main().catch(console.error);

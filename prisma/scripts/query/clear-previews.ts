import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const appIds = ["cmmazng4j6l30lhxg", "cmmazngxepned6qu8"];

  for (const id of appIds) {
    await client.execute({
      sql: `UPDATE GeneratedApp SET previewFlyAppId = NULL, previewFlyUrl = NULL, screenshot = NULL WHERE id = ?`,
      args: [id],
    });

    // Also clear App record
    const gen = await client.execute({ sql: `SELECT appId FROM GeneratedApp WHERE id = ?`, args: [id] });
    const appId = gen.rows[0]?.appId as string;
    if (appId) {
      await client.execute({
        sql: `UPDATE App SET previewUrl = NULL, previewFlyAppId = NULL, screenshot = NULL WHERE id = ?`,
        args: [appId],
      });
    }
    console.log(`Cleared preview fields for ${id} (app: ${appId})`);
  }
}

main().catch(console.error);

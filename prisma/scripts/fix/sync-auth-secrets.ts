import "dotenv/config";
import { createClient } from "@libsql/client";
import { execSync } from "child_process";

const FLYCTL = "/Users/owenmarr/.fly/bin/flyctl";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const apps = await client.execute(`
    SELECT a.title, oa.flyAppId, oa.authSecret
    FROM OrgApp oa
    JOIN Organization o ON oa.organizationId = o.id
    JOIN App a ON oa.appId = a.id
    WHERE o.slug = 'space-gods-inc' AND oa.status IN ('RUNNING', 'PREVIEW')
    ORDER BY a.title
  `);

  for (const row of apps.rows) {
    const flyAppId = row.flyAppId as string;
    const authSecret = row.authSecret as string;
    const title = row.title as string;

    if (!authSecret) {
      console.log(`${title}: NO authSecret in DB, skipping`);
      continue;
    }

    console.log(`${title} (${flyAppId}): syncing AUTH_SECRET...`);
    try {
      execSync(
        `${FLYCTL} secrets set "AUTH_SECRET=${authSecret}" --app ${flyAppId}`,
        { timeout: 60000, stdio: "pipe" }
      );
      console.log(`  OK (machine will restart)`);
    } catch (err: unknown) {
      const e = err as { stderr?: string };
      console.error(`  FAILED: ${e.stderr?.slice(0, 200)}`);
    }
  }
}

main().catch(console.error);

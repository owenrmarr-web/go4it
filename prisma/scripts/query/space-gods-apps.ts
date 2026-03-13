import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const result = await client.execute(`
    SELECT
      oa.id as orgAppId,
      oa.flyAppId,
      oa.flyUrl,
      oa.status,
      oa.subdomain,
      a.title as appTitle,
      ga.sourceDir
    FROM OrgApp oa
    JOIN Organization o ON oa.organizationId = o.id
    JOIN App a ON oa.appId = a.id
    LEFT JOIN GeneratedApp ga ON ga.appId = a.id
    WHERE o.slug = 'space-gods-inc'
    ORDER BY a.title
  `);

  console.log(`\nSpace Gods Inc. — ${result.rows.length} apps:\n`);
  for (const row of result.rows) {
    console.log(`  ${row.appTitle}`);
    console.log(`    Status: ${row.status}`);
    console.log(`    Fly App: ${row.flyAppId}`);
    console.log(`    URL: ${row.flyUrl}`);
    console.log(`    Subdomain: ${row.subdomain}`);
    console.log(`    Source: ${row.sourceDir}`);
    console.log();
  }
}

main().catch(console.error);

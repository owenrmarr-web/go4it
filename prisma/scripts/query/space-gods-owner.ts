import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Find org owner
  const owner = await client.execute(`
    SELECT u.id, u.email, u.name, om.role
    FROM OrganizationMember om
    JOIN User u ON om.userId = u.id
    JOIN Organization o ON om.organizationId = o.id
    WHERE o.slug = 'space-gods-inc' AND om.role = 'OWNER'
  `);
  console.log("Owner:", owner.rows[0]);

  // Find deployed apps with URLs
  const apps = await client.execute(`
    SELECT a.title, oa.flyAppId, oa.flyUrl
    FROM OrgApp oa
    JOIN Organization o ON oa.organizationId = o.id
    JOIN App a ON oa.appId = a.id
    WHERE o.slug = 'space-gods-inc' AND oa.status IN ('RUNNING', 'PREVIEW')
    ORDER BY a.title
  `);
  console.log("\nDeployed apps:");
  for (const row of apps.rows) {
    console.log(`  ${row.title}: ${row.flyUrl} (${row.flyAppId})`);
  }
}

main().catch(console.error);

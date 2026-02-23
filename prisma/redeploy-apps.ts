import "dotenv/config";

/**
 * Trigger redeploy for all RUNNING OrgApps via the builder service.
 * This runs upgradeTemplateInfra() on each app during the deploy pipeline.
 *
 * Usage: DATABASE_URL="libsql://..." npx tsx prisma/redeploy-apps.ts
 */

const BUILDER_URL = "https://go4it-builder.fly.dev";
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

if (!BUILDER_API_KEY) {
  console.error("BUILDER_API_KEY is required");
  process.exit(1);
}

// Use LibSQL directly for the production database
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // 1. Get all RUNNING OrgApps with their details
  const orgApps = await client.execute(`
    SELECT
      oa.id as orgAppId,
      oa.appId,
      oa.flyAppId,
      oa.flyUrl,
      oa.status,
      oa.subdomain,
      oa.organizationId,
      o.slug as orgSlug,
      ga.id as generationId,
      ga.uploadBlobUrl
    FROM OrgApp oa
    JOIN Organization o ON oa.organizationId = o.id
    JOIN App a ON oa.appId = a.id
    LEFT JOIN GeneratedApp ga ON ga.appId = a.id
    WHERE oa.status = 'RUNNING'
  `);

  console.log(`Found ${orgApps.rows.length} RUNNING apps:\n`);
  for (const row of orgApps.rows) {
    console.log(`  ${row.orgAppId} → ${row.flyAppId} (${row.orgSlug})`);
  }
  console.log();

  // 2. For each app, get team members
  for (const row of orgApps.rows) {
    const orgAppId = row.orgAppId as string;
    const orgSlug = row.orgSlug as string;
    const generationId = row.generationId as string | null;
    const uploadBlobUrl = row.uploadBlobUrl as string | null;
    const flyAppId = row.flyAppId as string;
    const subdomain = row.subdomain as string | null;

    // Get all org members
    const orgMembers = await client.execute({
      sql: `
        SELECT u.name, u.email, u.password, u.username, u.image, u.profileColor, u.profileEmoji, om.title
        FROM OrganizationMember om
        JOIN User u ON om.userId = u.id
        WHERE om.organizationId = ?
      `,
      args: [row.organizationId as string],
    });

    // Get assigned app members
    const appMembers = await client.execute({
      sql: `
        SELECT u.email
        FROM OrgAppMember oam
        JOIN User u ON oam.userId = u.id
        WHERE oam.orgAppId = ?
      `,
      args: [orgAppId],
    });

    const assignedEmails = new Set(appMembers.rows.map((m) => m.email as string));

    // Get org owner for password hash
    const ownerResult = await client.execute({
      sql: `
        SELECT u.email, u.password
        FROM OrganizationMember om
        JOIN User u ON om.userId = u.id
        WHERE om.organizationId = ? AND om.role = 'OWNER'
        LIMIT 1
      `,
      args: [row.organizationId as string],
    });
    const ownerEmail = ownerResult.rows[0]?.email as string | undefined;
    const ownerPassword = ownerResult.rows[0]?.password as string | undefined;

    const teamMembers = orgMembers.rows
      .filter((m) => m.email)
      .map((m) => ({
        name: (m.name as string) || (m.email as string),
        email: m.email as string,
        assigned: assignedEmails.has(m.email as string),
        ...(m.email === ownerEmail && ownerPassword && assignedEmails.has(m.email as string)
          ? { passwordHash: ownerPassword }
          : {}),
        username: (m.username as string) || null,
        title: (m.title as string) || null,
        image: (m.image as string) || null,
        profileColor: (m.profileColor as string) || null,
        profileEmoji: (m.profileEmoji as string) || null,
      }));

    console.log(`Redeploying ${flyAppId} (${orgSlug})...`);
    console.log(`  Team: ${teamMembers.map((m) => `${m.email}${m.assigned ? "" : " [unassigned]"}`).join(", ")}`);

    const payload = {
      orgAppId,
      orgSlug,
      generationId: generationId || undefined,
      uploadBlobUrl: uploadBlobUrl || undefined,
      teamMembers,
      subdomain: subdomain || undefined,
      existingFlyAppId: flyAppId,
    };

    try {
      const res = await fetch(`${BUILDER_URL}/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BUILDER_API_KEY}`,
        },
        body: JSON.stringify(payload),
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

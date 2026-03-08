import "dotenv/config";
import { createClient } from "@libsql/client";
import { getGoSuiteTemplateMap } from "./gosuite-map";

const BUILDER_URL = "https://go4it-builder.fly.dev";
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;
const BATCH_SIZE = 2;
const POLL_INTERVAL_MS = 30_000; // 30s

if (!BUILDER_API_KEY) {
  console.error("BUILDER_API_KEY is required");
  process.exit(1);
}

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const GO_SUITE_TEMPLATE_MAP = getGoSuiteTemplateMap();

async function waitForBuilderIdle(): Promise<void> {
  // Simple wait — give deploys time to finish
  console.log(`  Waiting ${POLL_INTERVAL_MS / 1000}s for deploys to complete...`);
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
}

async function main() {
  const orgApps = await client.execute(`
    SELECT oa.id as orgAppId, oa.flyAppId, oa.status, oa.subdomain,
           a.title as appTitle, o.slug as orgSlug, o.id as orgId,
           ga.id as generationId, ga.uploadBlobUrl
    FROM OrgApp oa
    JOIN Organization o ON oa.organizationId = o.id
    JOIN App a ON oa.appId = a.id
    LEFT JOIN GeneratedApp ga ON ga.appId = a.id
    WHERE oa.status = 'RUNNING'
  `);

  console.log(`Found ${orgApps.rows.length} RUNNING apps.\n`);

  // Build payloads
  const payloads: { label: string; payload: Record<string, unknown> }[] = [];

  for (const row of orgApps.rows) {
    const orgAppId = row.orgAppId as string;
    const flyAppId = row.flyAppId as string;
    const orgSlug = row.orgSlug as string;
    const subdomain = row.subdomain as string | null;
    const appTitle = row.appTitle as string;
    const templateApp = GO_SUITE_TEMPLATE_MAP[appTitle];

    // Get org members
    const orgMembers = await client.execute({
      sql: `SELECT u.name, u.email, u.password, u.username, u.image, u.profileColor, u.profileEmoji, om.title
            FROM OrganizationMember om JOIN User u ON om.userId = u.id
            WHERE om.organizationId = ?`,
      args: [row.orgId as string],
    });

    const appMembers = await client.execute({
      sql: `SELECT u.email FROM OrgAppMember oam JOIN User u ON oam.userId = u.id WHERE oam.orgAppId = ?`,
      args: [orgAppId],
    });

    const assignedEmails = new Set(appMembers.rows.map((m) => m.email as string));

    const ownerResult = await client.execute({
      sql: `SELECT u.email, u.password FROM OrganizationMember om JOIN User u ON om.userId = u.id
            WHERE om.organizationId = ? AND om.role = 'OWNER' LIMIT 1`,
      args: [row.orgId as string],
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

    const p: Record<string, unknown> = {
      orgAppId,
      orgSlug,
      teamMembers,
      subdomain: subdomain || undefined,
      existingFlyAppId: flyAppId,
    };

    if (templateApp) {
      p.templateApp = templateApp;
    } else {
      p.generationId = (row.generationId as string) || undefined;
      p.uploadBlobUrl = (row.uploadBlobUrl as string) || undefined;
    }

    payloads.push({ label: `${appTitle} (${flyAppId})`, payload: p });
  }

  // Deploy in batches
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(payloads.length / BATCH_SIZE);

    console.log(`=== Batch ${batchNum}/${totalBatches} ===`);

    for (const { label, payload } of batch) {
      console.log(`  Deploying ${label}...`);
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
          console.log(`  ✓ Accepted: ${data.flyAppId || data.status}`);
        } else {
          console.error(`  ✗ Failed (${res.status}): ${await res.text()}`);
        }
      } catch (err) {
        console.error(`  ✗ Error: ${err}`);
      }
    }

    // Wait between batches (skip after last batch)
    if (i + BATCH_SIZE < payloads.length) {
      await waitForBuilderIdle();
      // Extra wait for safety — org deploys are heavier
      console.log("  Extra wait for deploy completion...");
      await new Promise((r) => setTimeout(r, 150_000)); // 2.5 min extra
    }
  }

  console.log("\nAll batches dispatched!");
}

main().catch(console.error);

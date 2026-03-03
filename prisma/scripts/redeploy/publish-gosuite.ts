import "dotenv/config";

/**
 * Register Go Suite apps in the marketplace database.
 * Scans builder/apps/ for go4it.json manifests, upserts App + GeneratedApp records in Turso.
 *
 * Usage:
 *   DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npx tsx prisma/scripts/redeploy/publish-gosuite.ts
 *   npx tsx prisma/scripts/redeploy/publish-gosuite.ts --app goinventory   # single app
 *   npx tsx prisma/scripts/redeploy/publish-gosuite.ts --dry-run           # preview only
 */

import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface Manifest {
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
}

function generateCuid(): string {
  // Simple cuid-like ID for inserts
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const appFilter = args.includes("--app") ? args[args.indexOf("--app") + 1] : null;

  const appsDir = join(__dirname, "../../../builder/apps");
  const entries = readdirSync(appsDir, { withFileTypes: true }).filter((e) => e.isDirectory());

  // Load manifests
  const manifests: { dirName: string; manifest: Manifest }[] = [];
  for (const entry of entries) {
    if (appFilter && entry.name !== appFilter) continue;

    const manifestPath = join(appsDir, entry.name, "go4it.json");
    try {
      const raw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw) as Manifest;
      if (manifest.name) {
        manifests.push({ dirName: entry.name, manifest });
      }
    } catch {
      // No go4it.json — skip
    }
  }

  if (manifests.length === 0) {
    console.log("No Go Suite apps found to publish.");
    return;
  }

  console.log(`Found ${manifests.length} Go Suite app(s) to publish:\n`);
  for (const { dirName, manifest } of manifests) {
    console.log(`  ${manifest.icon} ${manifest.name} (${dirName}) — ${manifest.category}`);
  }
  console.log();

  if (dryRun) {
    console.log("[dry-run] No database changes made.");
    return;
  }

  // Find admin user for GeneratedApp.createdById
  const adminResult = await client.execute(
    `SELECT id FROM User WHERE email = 'admin@go4it.live' LIMIT 1`
  );
  if (adminResult.rows.length === 0) {
    console.error("Admin user (admin@go4it.live) not found. Run seed-admin-production.ts first.");
    process.exit(1);
  }
  const adminUserId = adminResult.rows[0].id as string;
  console.log(`Using admin user: ${adminUserId}\n`);

  for (const { dirName, manifest } of manifests) {
    const title = manifest.name;
    const tags = JSON.stringify(manifest.tags || []);

    console.log(`Publishing ${manifest.icon} ${title}...`);

    // Check if App already exists by title
    const existingApp = await client.execute({
      sql: `SELECT id FROM App WHERE title = ?`,
      args: [title],
    });

    let appId: string;

    if (existingApp.rows.length > 0) {
      appId = existingApp.rows[0].id as string;
      // Update existing App
      await client.execute({
        sql: `UPDATE App SET description = ?, category = ?, icon = ?, tags = ?, isGoSuite = 1, isPublic = 1 WHERE id = ?`,
        args: [manifest.description, manifest.category, manifest.icon, tags, appId],
      });
      console.log(`  ✓ App updated (${appId})`);
    } else {
      appId = generateCuid();
      await client.execute({
        sql: `INSERT INTO App (id, title, description, category, icon, author, tags, isGoSuite, isPublic, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`,
        args: [appId, title, manifest.description, manifest.category, manifest.icon, "GO4IT", tags],
      });
      console.log(`  ✓ App created (${appId})`);
    }

    // Check if GeneratedApp already exists for this App
    const existingGen = await client.execute({
      sql: `SELECT id FROM GeneratedApp WHERE appId = ?`,
      args: [appId],
    });

    if (existingGen.rows.length > 0) {
      const genId = existingGen.rows[0].id as string;
      await client.execute({
        sql: `UPDATE GeneratedApp SET title = ?, description = ?, status = 'COMPLETE', sourceDir = ?, updatedAt = datetime('now') WHERE id = ?`,
        args: [title, manifest.description, dirName, genId],
      });
      console.log(`  ✓ GeneratedApp updated (${genId})`);
    } else {
      const genId = generateCuid();
      await client.execute({
        sql: `INSERT INTO GeneratedApp (id, prompt, title, description, status, createdById, appId, sourceDir, source, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'COMPLETE', ?, ?, ?, 'generated', datetime('now'), datetime('now'))`,
        args: [genId, `Go Suite template: ${title}`, title, manifest.description, adminUserId, appId, dirName],
      });
      console.log(`  ✓ GeneratedApp created (${genId})`);
    }

    console.log();
  }

  console.log("Done. All Go Suite apps published to marketplace.");
}

main().catch(console.error);

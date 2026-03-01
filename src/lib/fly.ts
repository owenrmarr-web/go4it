import { spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "./prisma";

// ============================================
// Types
// ============================================

export type DeployStage =
  | "preparing"
  | "creating"
  | "building"
  | "deploying"
  | "configuring"
  | "running"
  | "failed";

export interface DeployProgress {
  stage: DeployStage;
  message: string;
  flyUrl?: string;
  error?: string;
}

const STAGE_MESSAGES: Record<DeployStage, string> = {
  preparing: "Preparing your app...",
  creating: "Setting up infrastructure...",
  building: "Building your app (this may take a few minutes)...",
  deploying: "Starting up...",
  configuring: "Setting up custom domain...",
  running: "Your app is live!",
  failed: "Something went wrong.",
};

// In-memory deploy progress store (same pattern as generator.ts)
const deployProgress = new Map<string, DeployProgress>();

const FLYCTL_PATH =
  process.env.FLYCTL_PATH || `${process.env.HOME}/.fly/bin/flyctl`;
const FLY_REGION = process.env.FLY_REGION || "ord";

// ============================================
// Progress helpers
// ============================================

export function getDeployProgress(orgAppId: string): DeployProgress {
  return (
    deployProgress.get(orgAppId) ?? {
      stage: "preparing",
      message: STAGE_MESSAGES.preparing,
    }
  );
}

function updateDeployProgress(
  orgAppId: string,
  stage: DeployStage,
  extra?: Partial<DeployProgress>
) {
  const progress: DeployProgress = {
    stage,
    message: STAGE_MESSAGES[stage],
    ...extra,
  };
  deployProgress.set(orgAppId, progress);
}

export function cleanupDeployProgress(orgAppId: string) {
  deployProgress.delete(orgAppId);
}

// ============================================
// Shell command helpers
// ============================================

function runCommand(
  cmd: string,
  args: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: options?.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });

    child.on("error", (err) => {
      resolve({ stdout, stderr: err.message, code: 1 });
    });
  });
}

function flyctl(
  args: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string; code: number }> {
  return runCommand(FLYCTL_PATH, args, options);
}

// ============================================
// Deployment files generation
// ============================================

function generateFlyToml(appName: string): string {
  return `app = "${appName}"
primary_region = "${FLY_REGION}"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "suspend"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

[mounts]
  source = "data"
  destination = "/data"

[env]
  DATABASE_URL = "file:/data/app.db"
  PORT = "3000"
  NODE_ENV = "production"
  AUTH_TRUST_HOST = "true"
`;
}

function generateStartScript(): string {
  return `#!/bin/sh
set -e

echo "=== GO4IT App Startup ==="
mkdir -p /data 2>/dev/null || true

# --- Schema sync (skip if unchanged) ---
SCHEMA_HASH=$(md5sum prisma/schema.prisma | cut -d' ' -f1)
if [ ! -f "/data/.schema-$SCHEMA_HASH" ]; then
  echo "Running database setup..."
  npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues"
  rm -f /data/.schema-* 2>/dev/null
  touch "/data/.schema-$SCHEMA_HASH"
else
  echo "Schema unchanged, skipping db push."
fi

# --- Team provisioning (skip if unchanged) ---
if [ -n "$GO4IT_TEAM_MEMBERS" ]; then
  TEAM_HASH=$(echo "$GO4IT_TEAM_MEMBERS" | md5sum | cut -d' ' -f1)
  if [ ! -f "/data/.team-$TEAM_HASH" ]; then
    echo "Provisioning team members..."
    if [ -f "prisma/provision-users.js" ]; then
      node prisma/provision-users.js 2>&1 || echo "Warning: user provisioning had issues"
    elif [ -f "prisma/provision-users.ts" ]; then
      npx tsx prisma/provision-users.ts 2>&1 || echo "Warning: user provisioning had issues"
    fi
    rm -f /data/.team-* 2>/dev/null
    touch "/data/.team-$TEAM_HASH"
  else
    echo "Team unchanged, skipping provisioning."
  fi
fi

echo "Starting application..."
exec node server.js
`;
}

function generateDeployDockerfile(isPrisma7: boolean): string {
  const prismaConfigCopy = isPrisma7 ? "\nCOPY prisma.config.ts ./" : "";
  const prismaConfigCopyRunner = isPrisma7
    ? "\nCOPY --from=builder /app/prisma.config.ts ./"
    : "";

  return `FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
# Copy prisma schema + config BEFORE npm ci so postinstall "prisma generate" works
COPY prisma ./prisma${prismaConfigCopy}
RUN npm ci --legacy-peer-deps

COPY . .
# Provide a dummy DATABASE_URL at build time so Next.js can collect page data
ENV DATABASE_URL="file:./build.db"
RUN npm run build
# Pre-compile provisioning script for fast startup
RUN npx esbuild prisma/provision-users.ts --bundle --platform=node --outfile=prisma/provision-users.js --external:@prisma/client --external:bcryptjs --external:@prisma/adapter-libsql --external:@libsql/client 2>/dev/null || true

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy full node_modules for prisma CLI + tsx at startup
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy prisma schema, config, and scripts
COPY --from=builder /app/prisma ./prisma${prismaConfigCopyRunner}

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "start.sh"]
`;
}

function generateDockerignore(): string {
  return `node_modules
.next
.git
*.md
.env*
dev.db
`;
}

// ============================================
// Template infrastructure upgrade
// Patches older apps with latest template files at deploy time.
// Idempotent — safe to run on apps that already have the changes.
// ============================================

function auditTemplateInfra(sourceDir: string): { version: number; warnings: string[] } {
  console.log(`[InfraAudit] Auditing template infrastructure in ${sourceDir}`);

  const warnings: string[] = [];

  // Read template version
  const go4itPath = path.join(sourceDir, "src", "lib", "go4it.ts");
  let templateVersion = 0;
  if (existsSync(go4itPath)) {
    const content = readFileSync(go4itPath, "utf-8");
    const match = content.match(/GO4IT_TEMPLATE_VERSION\s*=\s*(\d+)/);
    if (match) templateVersion = parseInt(match[1], 10);
  } else {
    warnings.push("Missing src/lib/go4it.ts — app has no version marker");
  }

  // Check for key infrastructure markers
  const checks: { file: string; marker: string; name: string }[] = [
    { file: "prisma/schema.prisma", marker: "isAssigned", name: "isAssigned field" },
    { file: "prisma/schema.prisma", marker: "AccessRequest", name: "AccessRequest model" },
    { file: "prisma/schema.prisma", marker: "profileColor", name: "Profile fields" },
    { file: "src/auth.config.ts", marker: "verifySsoToken", name: "SSO token verification" },
    { file: "src/auth.config.ts", marker: "isBlocked", name: "Session enforcement" },
    { file: "src/auth.config.ts", marker: "ssoToken", name: "SSO credential" },
    { file: "src/middleware.ts", marker: '"/sso"', name: "SSO middleware skip" },
    { file: "src/app/globals.css", marker: "--g4-page", name: "Dark mode tokens" },
    { file: "src/app/layout.tsx", marker: "go4it-theme", name: "FOUC prevention script" },
  ];

  const fileExistsChecks = [
    { file: "src/app/api/team-sync/route.ts", name: "Team sync route" },
    { file: "src/app/api/data-import/route.ts", name: "Data import route" },
    { file: "src/app/sso/page.tsx", name: "SSO landing page" },
    { file: "src/components/ThemeToggle.tsx", name: "ThemeToggle component" },
    { file: "src/app/api/infra-version/route.ts", name: "Infra version endpoint" },
  ];

  for (const check of checks) {
    const filePath = path.join(sourceDir, check.file);
    if (!existsSync(filePath)) {
      warnings.push(`MISSING: ${check.file} (${check.name})`);
    } else {
      const content = readFileSync(filePath, "utf-8");
      if (!content.includes(check.marker)) {
        warnings.push(`INCOMPLETE: ${check.file} missing "${check.marker}" (${check.name})`);
      }
    }
  }

  for (const check of fileExistsChecks) {
    const filePath = path.join(sourceDir, check.file);
    if (!existsSync(filePath)) {
      warnings.push(`MISSING: ${check.file} (${check.name})`);
    }
  }

  if (warnings.length > 0) {
    console.warn(`[InfraAudit] App at v${templateVersion} has ${warnings.length} issue(s):`);
    warnings.forEach(w => console.warn(`  - ${w}`));
  } else {
    console.log(`[InfraAudit] App at v${templateVersion} — all infrastructure checks pass`);
  }

  return { version: templateVersion, warnings };
}


// Legacy upgradeTemplateInfra() patches (1-18) removed.
// Replaced by agent-based upgrade workflow — see playbook/upgrades.json
// and playbook/UPGRADE_INSTRUCTIONS.md. Git history preserves the original.

// ============================================
// Main deploy function
// ============================================

export async function deployApp(
  orgAppId: string,
  orgSlug: string,
  sourceDir: string,
  teamMembers: { name: string; email: string; assigned?: boolean; passwordHash?: string }[],
  subdomain?: string,
  existingFlyAppId?: string
): Promise<void> {
  // Re-deploy: reuse existing Fly app name. New deploy: generate one.
  const flyAppName = existingFlyAppId
    || `go4it-${orgSlug}-${orgAppId.slice(0, 8)}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
  const isRedeploy = !!existingFlyAppId;

  // Reuse existing authSecret on redeploy to prevent DB/Fly.io secret divergence
  let authSecret: string;
  if (isRedeploy) {
    const existing = await prisma.orgApp.findUnique({
      where: { id: orgAppId },
      select: { authSecret: true },
    });
    authSecret = existing?.authSecret || crypto.randomBytes(32).toString("hex");
  } else {
    authSecret = crypto.randomBytes(32).toString("hex");
  }

  try {
    // ---- Stage: Preparing ----
    updateDeployProgress(orgAppId, "preparing");

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: { status: "DEPLOYING" },
    });

    if (!existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }

    // Generate package-lock.json if missing (required for npm ci in Docker)
    const lockPath = path.join(sourceDir, "package-lock.json");
    if (!existsSync(lockPath)) {
      console.log(`[Deploy ${orgAppId}] Generating package-lock.json...`);
      const lockResult = await runCommand(
        "npm",
        ["install", "--package-lock-only", "--ignore-scripts"],
        { cwd: sourceDir }
      );
      if (lockResult.code !== 0) {
        throw new Error(
          `Failed to generate package-lock.json: ${lockResult.stderr}`
        );
      }
    }

    // Detect Prisma version from package.json (needed before generating deployment files)
    const pkgPath = path.join(sourceDir, "package.json");
    let isPrisma7 = false;
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        const prismaVersion =
          pkg.devDependencies?.prisma ||
          pkg.dependencies?.prisma ||
          pkg.dependencies?.["@prisma/client"] ||
          "";
        // ^7, ~7, 7.x, >=7, latest all indicate Prisma 7+
        isPrisma7 = /^[\^~>=]*7|^latest$/i.test(prismaVersion);
      } catch {
        // If we can't read package.json, assume Prisma 7 (existing behavior)
        isPrisma7 = true;
      }
    }

    console.log(`[Deploy ${orgAppId}] Detected Prisma ${isPrisma7 ? "7+" : "6 or earlier"}`);

    // Write deployment files into source directory
    writeFileSync(
      path.join(sourceDir, "fly.toml"),
      generateFlyToml(flyAppName)
    );
    writeFileSync(
      path.join(sourceDir, "start.sh"),
      generateStartScript()
    );
    writeFileSync(
      path.join(sourceDir, "Dockerfile.fly"),
      generateDeployDockerfile(isPrisma7)
    );
    writeFileSync(
      path.join(sourceDir, ".dockerignore"),
      generateDockerignore()
    );

    // Ensure public/ directory exists (Dockerfile COPY requires it)
    const publicDir = path.join(sourceDir, "public");
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    // Remove seed.ts (not needed at runtime, can cause TS errors)
    const seedPath = path.join(sourceDir, "prisma", "seed.ts");
    if (existsSync(seedPath)) {
      unlinkSync(seedPath);
    }

    if (isPrisma7) {
      // Prisma 7 requires the LibSQL adapter — rewrite prisma.ts and provision-users.ts
      // Also add @prisma/adapter-libsql + @libsql/client to dependencies if missing
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      let depsChanged = false;
      if (!pkg.dependencies?.["@prisma/adapter-libsql"]) {
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies["@prisma/adapter-libsql"] = "^7.0.0";
        depsChanged = true;
      }
      if (!pkg.dependencies?.["@libsql/client"]) {
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies["@libsql/client"] = "^0.14.0";
        depsChanged = true;
      }
      if (depsChanged) {
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
        // Regenerate lock file since we added dependencies
        const lockPath = path.join(sourceDir, "package-lock.json");
        if (existsSync(lockPath)) {
          unlinkSync(lockPath);
        }
        const lockResult = await runCommand(
          "npm",
          ["install", "--package-lock-only", "--legacy-peer-deps", "--ignore-scripts"],
          { cwd: sourceDir }
        );
        if (lockResult.code !== 0) {
          console.warn(`[Deploy ${orgAppId}] Lock regen warning: ${lockResult.stderr}`);
        }
      }

      // Replace prisma.ts with LibSQL adapter client
      const prismaClientPath = path.join(sourceDir, "src", "lib", "prisma.ts");
      if (existsSync(prismaClientPath)) {
        writeFileSync(
          prismaClientPath,
          `import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

if (!globalForPrisma.prisma) {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
export default prisma;
`
        );
      }

      // Rewrite provision-users.ts to use LibSQL adapter
      const provisionPath = path.join(sourceDir, "prisma", "provision-users.ts");
      if (existsSync(provisionPath)) {
        writeFileSync(
          provisionPath,
          `import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = process.env.GO4IT_ADMIN_PASSWORD;
  const adminHash = adminPassword
    ? await bcrypt.hash(adminPassword, 12)
    : await bcrypt.hash(crypto.randomUUID(), 12);

  // Always provision GO4IT admin account
  await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: { name: "GO4IT Admin", password: adminHash, role: "admin" },
    create: { email: "admin@go4it.live", name: "GO4IT Admin", password: adminHash, role: "admin" },
  });
  console.log("Provisioned: GO4IT Admin (admin@go4it.live)");

  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) { console.log("No GO4IT_TEAM_MEMBERS set, skipping."); return; }

  const members: { name: string; email: string; assigned?: boolean; passwordHash?: string }[] = JSON.parse(raw);

  for (const member of members) {
    const isAssigned = member.assigned !== false;
    const password = isAssigned
      ? (member.passwordHash || adminHash)
      : await bcrypt.hash(crypto.randomUUID(), 12);
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, password, isAssigned },
      create: { email: member.email, name: member.name, password, isAssigned },
    });
    console.log(\`Provisioned: \${member.name} (\${member.email})\${isAssigned ? "" : " [unassigned]"}\${member.passwordHash ? " [platform credentials]" : ""}\`);
  }
  console.log(\`Done — \${members.length + 1} users provisioned.\`);
}

main().finally(() => prisma.$disconnect());
`
        );
      }

      // Prisma 7: url property is NOT allowed in schema.prisma — must be in prisma.config.ts
      const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
      if (existsSync(schemaPath)) {
        let schema = readFileSync(schemaPath, "utf-8");
        // Remove url line if present (Prisma 7 rejects it)
        schema = schema.replace(/^\s*url\s*=\s*env\(.*\)\s*$/m, "");
        writeFileSync(schemaPath, schema);
      }

      // Delete the old prisma/prisma.config.ts if it exists (wrong location)
      const oldPrismaConfigPath = path.join(
        sourceDir,
        "prisma",
        "prisma.config.ts"
      );
      if (existsSync(oldPrismaConfigPath)) {
        unlinkSync(oldPrismaConfigPath);
      }

      // Write prisma.config.ts at project root (where Prisma 7 CLI expects it)
      const prismaConfigPath = path.join(sourceDir, "prisma.config.ts");
      writeFileSync(
        prismaConfigPath,
        `// @ts-nocheck
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
`
      );
    } else {
      // Prisma 6 or earlier: ensure schema.prisma has url = env("DATABASE_URL")
      const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
      if (existsSync(schemaPath)) {
        let schema = readFileSync(schemaPath, "utf-8");
        // If url line is missing from datasource block, add it back
        if (!/url\s*=/.test(schema)) {
          schema = schema.replace(
            /(datasource\s+\w+\s*\{[^}]*provider\s*=\s*"[^"]*")/,
            '$1\n  url      = env("DATABASE_URL")'
          );
          writeFileSync(schemaPath, schema);
        }
      }
    }

    // ---- Audit template infrastructure (read-only check) ----
    const infraAudit = auditTemplateInfra(sourceDir);
    if (infraAudit.warnings.length > 0) {
      console.warn(`[Deploy ${orgAppId}] Infrastructure audit found ${infraAudit.warnings.length} issue(s) — app should be upgraded via Claude VSCode`);
    }

    // ---- Stage: Creating ----
    updateDeployProgress(orgAppId, isRedeploy ? "building" : "creating");

    if (!isRedeploy) {
      // New deploy: create app + volume
      const createResult = await flyctl(
        ["apps", "create", flyAppName, "--json"],
        { cwd: sourceDir }
      );

      if (
        createResult.code !== 0 &&
        !createResult.stderr.includes("already exists") &&
        !createResult.stderr.includes("already been taken")
      ) {
        throw new Error(
          `Failed to create Fly.io app: ${createResult.stderr || createResult.stdout}`
        );
      }

      // Create a 1GB volume for SQLite persistence
      const volResult = await flyctl(
        [
          "volumes",
          "create",
          "data",
          "--size",
          "1",
          "--region",
          FLY_REGION,
          "--app",
          flyAppName,
          "--yes",
        ],
        { cwd: sourceDir }
      );

      if (
        volResult.code !== 0 &&
        !volResult.stderr.includes("already exists")
      ) {
        console.warn(`[Deploy ${orgAppId}] Volume warning: ${volResult.stderr}`);
      }
    } else {
      console.log(`[Deploy ${orgAppId}] Re-deploying to existing app: ${flyAppName}`);
    }

    // Set secrets (AUTH_SECRET + team members + admin password)
    const secrets: Record<string, string> = {
      AUTH_SECRET: authSecret,
    };
    if (teamMembers.length > 0) {
      secrets.GO4IT_TEAM_MEMBERS = JSON.stringify(teamMembers);
    }
    if (process.env.GO4IT_ADMIN_PASSWORD) {
      secrets.GO4IT_ADMIN_PASSWORD = process.env.GO4IT_ADMIN_PASSWORD;
    }

    const secretPairs = Object.entries(secrets).map(
      ([k, v]) => `${k}=${v}`
    );
    await flyctl(
      ["secrets", "set", ...secretPairs, "--app", flyAppName, "--stage"],
      { cwd: sourceDir }
    );

    // ---- Stage: Building & Deploying ----
    updateDeployProgress(orgAppId, "building");

    const deployResult = await flyctl(
      [
        "deploy",
        "--app",
        flyAppName,
        "--dockerfile",
        "Dockerfile.fly",
        "--yes",
        "--wait-timeout",
        "300",
      ],
      { cwd: sourceDir }
    );

    if (deployResult.code !== 0) {
      throw new Error(
        `Deploy failed: ${deployResult.stderr || deployResult.stdout}`
      );
    }

    // ---- Stage: Running ----
    // Use .fly.dev URL directly (custom subdomain DNS not yet working)
    const flyUrl = `https://${flyAppName}.fly.dev`;
    updateDeployProgress(orgAppId, "running", { flyUrl });

    // Look up version info for the deployed app
    const orgAppForVersion = await prisma.orgApp.findUnique({
      where: { id: orgAppId },
      include: { app: { include: { generatedApp: true } } },
    });
    const marketplaceVersion = orgAppForVersion?.app?.generatedApp?.marketplaceVersion ?? 1;
    const orgVersion = orgAppForVersion?.orgIterationCount ?? 0;

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: {
        status: "RUNNING",
        flyAppId: flyAppName,
        flyUrl,
        authSecret,
        subdomain: subdomain || undefined,
        deployedAt: new Date(),
        deployedMarketplaceVersion: marketplaceVersion,
        deployedOrgVersion: orgVersion,
        deployedInfraVersion: infraAudit.version || undefined,
      },
    });

    console.log(`[Deploy ${orgAppId}] Live at ${flyUrl} (infra v${infraAudit.version})`);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown deployment error";
    console.error(`[Deploy ${orgAppId}] Failed:`, errorMsg);

    updateDeployProgress(orgAppId, "failed", { error: errorMsg });

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: {
        status: "FAILED",
        flyAppId: flyAppName,
      },
    });
  }
}

// ============================================
// Launch (promote preview → production via secret flip)
// ============================================

export async function launchApp(
  orgAppId: string,
  flyAppName: string,
  teamMembers: { name: string; email: string; assigned?: boolean; passwordHash?: string }[],
  subdomain?: string
): Promise<void> {
  try {
    updateDeployProgress(orgAppId, "preparing");

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: { status: "DEPLOYING" },
    });

    // Reuse existing authSecret and infra version to prevent divergence
    const existing = await prisma.orgApp.findUnique({
      where: { id: orgAppId },
      select: { authSecret: true, deployedInfraVersion: true },
    });
    const authSecret = existing?.authSecret || crypto.randomBytes(32).toString("hex");

    const secrets: Record<string, string> = {
      PREVIEW_MODE: "false",
      AUTH_SECRET: authSecret,
    };
    if (teamMembers.length > 0) {
      secrets.GO4IT_TEAM_MEMBERS = JSON.stringify(teamMembers);
    }
    if (process.env.GO4IT_ADMIN_PASSWORD) {
      secrets.GO4IT_ADMIN_PASSWORD = process.env.GO4IT_ADMIN_PASSWORD;
    }

    const secretPairs = Object.entries(secrets).map(
      ([k, v]) => `${k}=${v}`
    );

    console.log(`[Launch ${orgAppId}] Setting secrets on ${flyAppName}...`);
    updateDeployProgress(orgAppId, "configuring");

    // secrets set (without --stage) atomically sets secrets and triggers a
    // machine restart. start.sh re-runs with PREVIEW_MODE=false which deletes
    // the seed DB, runs prisma db push, and provisions real team members.
    const result = await flyctl([
      "secrets",
      "set",
      ...secretPairs,
      "--app",
      flyAppName,
    ]);

    if (result.code !== 0) {
      throw new Error(
        `Failed to set secrets: ${result.stderr || result.stdout}`
      );
    }

    // Wait for the app to become healthy after restart
    const flyUrl = `https://${flyAppName}.fly.dev`;
    updateDeployProgress(orgAppId, "deploying");
    console.log(`[Launch ${orgAppId}] Waiting for app to become healthy...`);

    const HEALTH_TIMEOUT = 90_000;
    const HEALTH_INTERVAL = 3_000;
    const healthStart = Date.now();
    let healthy = false;

    while (Date.now() - healthStart < HEALTH_TIMEOUT) {
      await new Promise((r) => setTimeout(r, HEALTH_INTERVAL));
      try {
        const res = await fetch(flyUrl, {
          method: "GET",
          signal: AbortSignal.timeout(5_000),
        });
        if (res.ok || res.status === 302 || res.status === 307) {
          healthy = true;
          console.log(`[Launch ${orgAppId}] App is healthy (${res.status})`);
          break;
        }
        console.log(`[Launch ${orgAppId}] Health check: ${res.status}`);
      } catch {
        // App not ready yet — keep polling
      }
    }

    if (!healthy) {
      console.warn(`[Launch ${orgAppId}] Health check timed out — marking as running anyway`);
    }

    updateDeployProgress(orgAppId, "running", { flyUrl });

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: {
        status: "RUNNING",
        flyUrl,
        authSecret,
        subdomain: subdomain || undefined,
        deployedAt: new Date(),
        deployedInfraVersion: existing?.deployedInfraVersion || undefined,
      },
    });

    // Clear previewExpiresAt so cleanup doesn't destroy this production app
    const orgApp = await prisma.orgApp.findUnique({
      where: { id: orgAppId },
      include: { app: { include: { generatedApp: true } } },
    });
    if (orgApp?.app?.generatedApp) {
      await prisma.generatedApp.update({
        where: { id: orgApp.app.generatedApp.id },
        data: { previewExpiresAt: null },
      });
    }

    console.log(`[Launch ${orgAppId}] Live at ${flyUrl}`);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown launch error";
    console.error(`[Launch ${orgAppId}] Failed:`, errorMsg);

    updateDeployProgress(orgAppId, "failed", { error: errorMsg });

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: { status: "FAILED" },
    });
  }
}

// ============================================
// App management helpers
// ============================================

export async function destroyApp(flyAppName: string): Promise<void> {
  await flyctl(["apps", "destroy", flyAppName, "--yes"]);
}

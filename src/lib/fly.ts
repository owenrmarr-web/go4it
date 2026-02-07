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
  auto_stop_machines = "stop"
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

# Ensure data directory is writable
mkdir -p /data 2>/dev/null || true

# Run prisma db push to create/update tables
echo "Running database setup..."
npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues"

# Provision team members if env var is set
if [ -n "$GO4IT_TEAM_MEMBERS" ] && [ -f "prisma/provision-users.ts" ]; then
  echo "Provisioning team members..."
  npx tsx prisma/provision-users.ts 2>&1 || echo "Warning: user provisioning had issues"
fi

echo "Starting application..."
exec node server.js
`;
}

function generateDeployDockerfile(): string {
  return `FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
# Copy prisma schema + config BEFORE npm ci so postinstall "prisma generate" works
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
# Provide a dummy DATABASE_URL at build time so Next.js can collect page data
ENV DATABASE_URL="file:./build.db"
RUN npm run build

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
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

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
// Main deploy function
// ============================================

export async function deployApp(
  orgAppId: string,
  orgSlug: string,
  sourceDir: string,
  teamMembers: { name: string; email: string }[]
): Promise<void> {
  // Create a URL-safe app name from org slug + short ID
  const flyAppName = `go4it-${orgSlug}-${orgAppId.slice(0, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const authSecret = crypto.randomBytes(32).toString("hex");

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
        ["install", "--package-lock-only"],
        { cwd: sourceDir }
      );
      if (lockResult.code !== 0) {
        throw new Error(
          `Failed to generate package-lock.json: ${lockResult.stderr}`
        );
      }
    }

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
      generateDeployDockerfile()
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

    // Replace prisma.ts with LibSQL adapter client
    // Uses node:20-slim (Debian) where LibSQL native bindings work (unlike Alpine/musl)
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

    // Rewrite provision-users.ts to use LibSQL adapter (Prisma 7 requires adapter)
    const provisionPath = path.join(sourceDir, "prisma", "provision-users.ts");
    if (existsSync(provisionPath)) {
      writeFileSync(
        provisionPath,
        `import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) { console.log("No GO4IT_TEAM_MEMBERS set, skipping."); return; }

  const members: { name: string; email: string }[] = JSON.parse(raw);
  const password = await bcrypt.hash("go4it2026", 12);

  for (const member of members) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name },
      create: { email: member.email, name: member.name, password },
    });
    console.log(\`Provisioned: \${member.name} (\${member.email})\`);
  }
  console.log(\`Done — \${members.length} users provisioned.\`);
}

main().finally(() => prisma.$disconnect());
`
      );
    }

    // Prisma 7: url property is NOT allowed in schema.prisma — must be in prisma.config.ts
    // Ensure schema.prisma does NOT have a url property
    const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
    if (existsSync(schemaPath)) {
      let schema = readFileSync(schemaPath, "utf-8");
      // Remove url line if present (Prisma 7 rejects it)
      schema = schema.replace(/^\s*url\s*=\s*env\(.*\)\s*$/m, "");
      writeFileSync(schemaPath, schema);
    }

    // Delete the old prisma/prisma.config.ts if it exists (wrong location)
    const oldPrismaConfigPath = path.join(sourceDir, "prisma", "prisma.config.ts");
    if (existsSync(oldPrismaConfigPath)) {
      unlinkSync(oldPrismaConfigPath);
    }

    // Write prisma.config.ts at project root (where Prisma 7 CLI expects it)
    // Uses @ts-nocheck to avoid TypeScript errors during next build
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

    // ---- Stage: Creating ----
    updateDeployProgress(orgAppId, "creating");

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

    // Set secrets (AUTH_SECRET + team members)
    const secrets: Record<string, string> = {
      AUTH_SECRET: authSecret,
    };
    if (teamMembers.length > 0) {
      secrets.GO4IT_TEAM_MEMBERS = JSON.stringify(teamMembers);
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
    const flyUrl = `https://${flyAppName}.fly.dev`;
    updateDeployProgress(orgAppId, "running", { flyUrl });

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: {
        status: "RUNNING",
        flyAppId: flyAppName,
        flyUrl,
        deployedAt: new Date(),
      },
    });

    console.log(`[Deploy ${orgAppId}] Live at ${flyUrl}`);
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
// App management helpers
// ============================================

export async function destroyApp(flyAppName: string): Promise<void> {
  await flyctl(["apps", "destroy", flyAppName, "--yes"]);
}

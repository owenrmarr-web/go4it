import { spawn, execSync } from "child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
  rmSync,
} from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "./prisma.js";

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

// In-memory deploy progress (builder is single server, this is fine)
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
// Preview deployment files (slim — uses pre-built artifacts)
// ============================================

function generatePreviewFlyToml(appName: string): string {
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
  PREVIEW_MODE = "true"
`;
}

function generatePreviewStartScript(): string {
  return `#!/bin/sh
set -e

echo "=== GO4IT App Startup ==="

# Ensure data directory is writable
mkdir -p /data 2>/dev/null || true

if [ "$PREVIEW_MODE" = "true" ]; then
  # Preview mode: copy seed DB and start
  if [ ! -f /data/app.db ]; then
    cp /app/dev.db /data/app.db 2>/dev/null || echo "Warning: no seed DB found"
  fi
else
  # Production mode: fresh DB + real users
  rm -f /data/app.db

  echo "Running database setup..."
  npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues"

  if [ -n "$GO4IT_TEAM_MEMBERS" ] && [ -f "prisma/provision-users.ts" ]; then
    echo "Provisioning team members..."
    npx tsx prisma/provision-users.ts 2>&1 || echo "Warning: user provisioning had issues"
  fi
fi

echo "Starting application..."
exec node server.js
`;
}

function generatePreviewDockerfile(): string {
  return `FROM node:20-slim
WORKDIR /app

# Install OpenSSL so Prisma can detect the correct engine binary at runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy pre-built standalone Next.js output
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# Full node_modules (overrides standalone subset — needed for prisma CLI + tsx at production startup)
COPY node_modules ./node_modules
COPY package.json ./

# Prisma schema + provisioning scripts
COPY prisma ./prisma

# Seed database for preview mode
COPY dev.db ./dev.db

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "start.sh"]
`;
}

function generatePreviewDockerignore(): string {
  return `.git
*.md
.env*
src/
.next/cache
`;
}

// ============================================
// Preview infrastructure pre-creation (runs in parallel with CLI)
// ============================================

export async function preCreateFlyInfra(
  generationId: string,
  orgSlug: string
): Promise<string> {
  const flyAppName = `go4it-${orgSlug}-${generationId.slice(0, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  console.log(
    `[Preview ${generationId}] Pre-creating Fly infrastructure: ${flyAppName}`
  );

  const createResult = await flyctl(["apps", "create", flyAppName, "--json"]);
  if (
    createResult.code !== 0 &&
    !createResult.stderr.includes("already exists") &&
    !createResult.stderr.includes("already been taken")
  ) {
    throw new Error(
      `Failed to create Fly app: ${createResult.stderr || createResult.stdout}`
    );
  }

  const volResult = await flyctl([
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
  ]);
  if (volResult.code !== 0 && !volResult.stderr.includes("already exists")) {
    console.warn(
      `[Preview ${generationId}] Volume warning: ${volResult.stderr}`
    );
  }

  // Set auth secret
  const authSecret = crypto.randomBytes(32).toString("hex");
  await flyctl([
    "secrets",
    "set",
    `AUTH_SECRET=${authSecret}`,
    "--app",
    flyAppName,
    "--stage",
  ]);

  console.log(
    `[Preview ${generationId}] Fly infrastructure ready: ${flyAppName}`
  );
  return flyAppName;
}

// ============================================
// Preview deploy (slim Dockerfile with pre-built artifacts)
// ============================================

export async function deployPreviewApp(
  generationId: string,
  flyAppName: string,
  sourceDir: string
): Promise<string> {
  console.log(
    `[Preview ${generationId}] Deploying preview to ${flyAppName}...`
  );

  // Ensure .next/standalone exists — run build if missing
  const standalonePath = path.join(sourceDir, ".next", "standalone");
  if (!existsSync(standalonePath)) {
    console.log(
      `[Preview ${generationId}] Standalone not found, running npm run build...`
    );
    // Remove entire .next directory to avoid EACCES permission errors
    const nextDir = path.join(sourceDir, ".next");
    if (existsSync(nextDir)) {
      try { rmSync(nextDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    try {
      execSync("npm run build", {
        cwd: sourceDir,
        stdio: "pipe",
        timeout: 180000,
        env: { ...process.env, DATABASE_URL: "file:./dev.db" },
      });
    } catch (err) {
      // Check if standalone was created despite non-zero exit (warnings)
      if (!existsSync(standalonePath)) {
        throw new Error(
          `Build failed to produce standalone output at ${standalonePath}: ${(err as Error).message?.slice(0, 200)}`
        );
      }
    }
  }

  // Write preview deploy files
  writeFileSync(
    path.join(sourceDir, "fly.toml"),
    generatePreviewFlyToml(flyAppName)
  );
  writeFileSync(
    path.join(sourceDir, "start.sh"),
    generatePreviewStartScript()
  );
  writeFileSync(
    path.join(sourceDir, "Dockerfile.fly"),
    generatePreviewDockerfile()
  );
  writeFileSync(
    path.join(sourceDir, ".dockerignore"),
    generatePreviewDockerignore()
  );

  // Ensure public/ exists
  const publicDir = path.join(sourceDir, "public");
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Deploy using slim Dockerfile
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
      `Preview deploy failed: ${deployResult.stderr || deployResult.stdout}`
    );
  }

  const flyUrl = `https://${flyAppName}.fly.dev`;
  console.log(`[Preview ${generationId}] Live at ${flyUrl}`);
  return flyUrl;
}

// ============================================
// Main deploy function (go-live / full deploy)
// ============================================

export async function deployApp(
  orgAppId: string,
  orgSlug: string,
  sourceDir: string,
  teamMembers: { name: string; email: string; passwordHash?: string }[],
  subdomain?: string,
  existingFlyAppId?: string
): Promise<void> {
  const flyAppName =
    existingFlyAppId ||
    `go4it-${orgSlug}-${orgAppId.slice(0, 8)}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
  const isRedeploy = !!existingFlyAppId;
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

    // Generate package-lock.json if missing
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

    // Detect Prisma version
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
        isPrisma7 = /^[\^~>=]*7|^latest$/i.test(prismaVersion);
      } catch {
        isPrisma7 = true;
      }
    }

    console.log(
      `[Deploy ${orgAppId}] Detected Prisma ${isPrisma7 ? "7+" : "6 or earlier"}`
    );

    // Write deployment files
    writeFileSync(
      path.join(sourceDir, "fly.toml"),
      generateFlyToml(flyAppName)
    );
    writeFileSync(path.join(sourceDir, "start.sh"), generateStartScript());
    writeFileSync(
      path.join(sourceDir, "Dockerfile.fly"),
      generateDeployDockerfile(isPrisma7)
    );
    writeFileSync(
      path.join(sourceDir, ".dockerignore"),
      generateDockerignore()
    );

    // Ensure public/ exists
    const publicDir = path.join(sourceDir, "public");
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    // Remove seed.ts (not needed at runtime)
    const seedPath = path.join(sourceDir, "prisma", "seed.ts");
    if (existsSync(seedPath)) {
      unlinkSync(seedPath);
    }

    if (isPrisma7) {
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
        const existingLock = path.join(sourceDir, "package-lock.json");
        if (existsSync(existingLock)) {
          unlinkSync(existingLock);
        }
        const lockResult = await runCommand(
          "npm",
          ["install", "--package-lock-only", "--legacy-peer-deps"],
          { cwd: sourceDir }
        );
        if (lockResult.code !== 0) {
          console.warn(
            `[Deploy ${orgAppId}] Lock regen warning: ${lockResult.stderr}`
          );
        }
      }

      // Replace prisma.ts with LibSQL adapter client
      const prismaClientPath = path.join(
        sourceDir,
        "src",
        "lib",
        "prisma.ts"
      );
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

      // Rewrite provision-users.ts
      const provisionPath = path.join(
        sourceDir,
        "prisma",
        "provision-users.ts"
      );
      if (existsSync(provisionPath)) {
        writeFileSync(
          provisionPath,
          `import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultPassword = await bcrypt.hash("go4it2026", 12);

  // Always provision GO4IT admin account
  await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: { name: "GO4IT Admin" },
    create: { email: "admin@go4it.live", name: "GO4IT Admin", password: defaultPassword },
  });
  console.log("Provisioned: GO4IT Admin (admin@go4it.live)");

  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) { console.log("No GO4IT_TEAM_MEMBERS set, skipping."); return; }

  const members: { name: string; email: string; passwordHash?: string }[] = JSON.parse(raw);

  for (const member of members) {
    const password = member.passwordHash || defaultPassword;
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, password },
      create: { email: member.email, name: member.name, password },
    });
    console.log(\`Provisioned: \${member.name} (\${member.email})\${member.passwordHash ? " [platform credentials]" : ""}\`);
  }
  console.log(\`Done — \${members.length + 1} users provisioned.\`);
}

main().finally(() => prisma.$disconnect());
`
        );
      }

      // Remove url from schema.prisma
      const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
      if (existsSync(schemaPath)) {
        let schema = readFileSync(schemaPath, "utf-8");
        schema = schema.replace(/^\s*url\s*=\s*env\(.*\)\s*$/m, "");
        writeFileSync(schemaPath, schema);
      }

      // Delete old prisma config if in wrong location
      const oldPrismaConfigPath = path.join(
        sourceDir,
        "prisma",
        "prisma.config.ts"
      );
      if (existsSync(oldPrismaConfigPath)) {
        unlinkSync(oldPrismaConfigPath);
      }

      // Write prisma.config.ts at project root
      writeFileSync(
        path.join(sourceDir, "prisma.config.ts"),
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
      // Prisma 6: ensure schema has url
      const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
      if (existsSync(schemaPath)) {
        let schema = readFileSync(schemaPath, "utf-8");
        if (!/url\s*=/.test(schema)) {
          schema = schema.replace(
            /(datasource\s+\w+\s*\{[^}]*provider\s*=\s*"[^"]*")/,
            '$1\n  url      = env("DATABASE_URL")'
          );
          writeFileSync(schemaPath, schema);
        }
      }
    }

    // ---- Stage: Creating ----
    updateDeployProgress(orgAppId, isRedeploy ? "building" : "creating");

    if (!isRedeploy) {
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
        console.warn(
          `[Deploy ${orgAppId}] Volume warning: ${volResult.stderr}`
        );
      }
    } else {
      console.log(
        `[Deploy ${orgAppId}] Re-deploying to existing app: ${flyAppName}`
      );
    }

    // Set secrets
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
    // Use .fly.dev URL directly (custom subdomain DNS not yet working)
    const flyUrl = `https://${flyAppName}.fly.dev`;
    updateDeployProgress(orgAppId, "running", { flyUrl });

    const orgAppForVersion = await prisma.orgApp.findUnique({
      where: { id: orgAppId },
      include: { app: { include: { generatedApp: true } } },
    });
    const marketplaceVersion =
      orgAppForVersion?.app?.generatedApp?.marketplaceVersion ?? 1;
    const orgVersion = orgAppForVersion?.orgIterationCount ?? 0;

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: {
        status: "RUNNING",
        flyAppId: flyAppName,
        flyUrl,
        subdomain: subdomain || undefined,
        deployedAt: new Date(),
        deployedMarketplaceVersion: marketplaceVersion,
        deployedOrgVersion: orgVersion,
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
// Launch (promote preview → production via secret flip)
// ============================================

export async function launchApp(
  orgAppId: string,
  flyAppName: string,
  teamMembers: { name: string; email: string; passwordHash?: string }[],
  subdomain?: string
): Promise<void> {
  try {
    updateDeployProgress(orgAppId, "preparing");

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: { status: "DEPLOYING" },
    });

    const authSecret = crypto.randomBytes(32).toString("hex");

    // Build secrets — setting without --stage triggers a machine restart
    const secrets: Record<string, string> = {
      PREVIEW_MODE: "false",
      AUTH_SECRET: authSecret,
    };
    if (teamMembers.length > 0) {
      secrets.GO4IT_TEAM_MEMBERS = JSON.stringify(teamMembers);
    }

    const secretPairs = Object.entries(secrets).map(
      ([k, v]) => `${k}=${v}`
    );

    console.log(`[Launch ${orgAppId}] Setting secrets on ${flyAppName}...`);
    updateDeployProgress(orgAppId, "configuring");

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

    // Success — update DB
    const flyUrl = `https://${flyAppName}.fly.dev`;
    updateDeployProgress(orgAppId, "running", { flyUrl });

    await prisma.orgApp.update({
      where: { id: orgAppId },
      data: {
        status: "RUNNING",
        flyUrl,
        subdomain: subdomain || undefined,
        deployedAt: new Date(),
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

export async function destroyApp(flyAppName: string): Promise<void> {
  await flyctl(["apps", "destroy", flyAppName, "--yes"]);
}

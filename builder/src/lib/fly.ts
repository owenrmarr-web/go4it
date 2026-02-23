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
RUN npx prisma db push --accept-data-loss 2>&1 || true
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
mkdir -p /data 2>/dev/null || true

if [ "$PREVIEW_MODE" = "true" ]; then
  # Preview mode: copy seed DB and start
  if [ ! -f /data/app.db ]; then
    cp /app/dev.db /data/app.db 2>/dev/null || echo "Warning: no seed DB found"
  fi
else
  # Production mode: fresh DB + real users
  rm -f /data/app.db

  # --- Schema sync ---
  echo "Running database setup..."
  npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues"

  # --- Team provisioning ---
  if [ -n "$GO4IT_TEAM_MEMBERS" ]; then
    echo "Provisioning team members..."
    if [ -f "prisma/provision-users.js" ]; then
      node prisma/provision-users.js 2>&1 || echo "Warning: user provisioning had issues"
    elif [ -f "prisma/provision-users.ts" ]; then
      npx tsx prisma/provision-users.ts 2>&1 || echo "Warning: user provisioning had issues"
    fi
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
COPY prisma/dev.db ./dev.db

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
        timeout: 300000, // 5 minutes — cold builds on shared-cpu can be slow
        env: { ...process.env, DATABASE_URL: "file:./dev.db" },
      });
    } catch (err) {
      // Check if standalone was created despite non-zero exit (warnings)
      if (!existsSync(standalonePath)) {
        const stderr = (err as { stderr?: Buffer })?.stderr?.toString()?.slice(0, 1000) || "";
        const stdout = (err as { stdout?: Buffer })?.stdout?.toString()?.slice(-1000) || "";
        console.error(`[Preview ${generationId}] Build stderr: ${stderr}`);
        console.error(`[Preview ${generationId}] Build stdout (tail): ${stdout}`);
        throw new Error(
          `Build failed to produce standalone output at ${standalonePath}: ${(err as Error).message?.slice(0, 200)}`
        );
      }
    }
  }

  // Pre-compile provision-users.ts for fast startup
  const provisionTsPath = path.join(sourceDir, "prisma", "provision-users.ts");
  if (existsSync(provisionTsPath)) {
    try {
      execSync(
        "npx esbuild prisma/provision-users.ts --bundle --platform=node --outfile=prisma/provision-users.js --external:@prisma/client --external:bcryptjs --external:@prisma/adapter-libsql --external:@libsql/client",
        { cwd: sourceDir, stdio: "pipe", timeout: 30000 }
      );
      console.log(`[Preview ${generationId}] Pre-compiled provision-users.js`);
    } catch { /* non-fatal — start.sh falls back to tsx */ }
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
// Template infrastructure upgrade
// Patches older apps with latest template files at deploy time.
// Idempotent — safe to run on apps that already have the changes.
// ============================================

function upgradeTemplateInfra(sourceDir: string): void {
  console.log(`[TemplateUpgrade] Upgrading template infrastructure in ${sourceDir}`);

  // --- 1. Patch schema.prisma: add isAssigned + AccessRequest ---
  const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
  if (existsSync(schemaPath)) {
    let schema = readFileSync(schemaPath, "utf-8");
    let patched = false;

    // Add isAssigned field to User model if missing
    if (!schema.includes("isAssigned")) {
      schema = schema.replace(
        /(role\s+String\s+@default\("member"\)[^\n]*\n)/,
        "$1  isAssigned     Boolean          @default(true)\n"
      );
      patched = true;
      console.log("[TemplateUpgrade] Added isAssigned to User model");
    }

    // Add accessRequests relation to User model if missing
    if (!schema.includes("accessRequests")) {
      schema = schema.replace(
        /(sessions\s+Session\[\][^\n]*\n)/,
        "$1  accessRequests AccessRequest[]\n"
      );
      patched = true;
      console.log("[TemplateUpgrade] Added accessRequests relation to User model");
    }

    // Add AccessRequest model if missing
    if (!schema.includes("model AccessRequest")) {
      const accessRequestModel = `model AccessRequest {
  id            String   @id @default(cuid())
  requestedBy   String
  requestedFor  String
  status        String   @default("pending")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [requestedBy], references: [id])
}

`;
      if (schema.includes("// === Add app-specific models below this line ===")) {
        schema = schema.replace(
          "// === Add app-specific models below this line ===",
          accessRequestModel + "// === Add app-specific models below this line ==="
        );
      } else {
        schema = schema.trimEnd() + "\n\n" + accessRequestModel;
      }
      patched = true;
      console.log("[TemplateUpgrade] Added AccessRequest model");
    }

    if (patched) {
      writeFileSync(schemaPath, schema);
    }
  }

  // --- 2. Patch auth.config.ts: block unassigned users ---
  const authConfigPath = path.join(sourceDir, "src", "auth.config.ts");
  if (existsSync(authConfigPath)) {
    let authConfig = readFileSync(authConfigPath, "utf-8");

    if (!authConfig.includes("isAssigned")) {
      authConfig = authConfig.replace(
        "if (!user) return null;",
        "if (!user) return null;\n\n        // Block unassigned org members from logging in\n        if (!user.isAssigned) return null;"
      );
      writeFileSync(authConfigPath, authConfig);
      console.log("[TemplateUpgrade] Added isAssigned check to auth.config.ts");
    }
  }

  // --- 3. Add access-requests API route if missing ---
  const accessRequestsDir = path.join(sourceDir, "src", "app", "api", "access-requests");
  const accessRequestsPath = path.join(accessRequestsDir, "route.ts");
  if (!existsSync(accessRequestsPath)) {
    mkdirSync(accessRequestsDir, { recursive: true });
    writeFileSync(
      accessRequestsPath,
      `import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestedFor } = await request.json();
  if (!requestedFor || typeof requestedFor !== "string") {
    return NextResponse.json({ error: "requestedFor email is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: requestedFor },
  });
  if (!targetUser || targetUser.isAssigned) {
    return NextResponse.json({ error: "User not found or already assigned" }, { status: 400 });
  }

  const existing = await prisma.accessRequest.findFirst({
    where: { requestedFor, status: "pending" },
  });
  if (existing) {
    return NextResponse.json({ error: "A pending request already exists" }, { status: 409 });
  }

  const accessRequest = await prisma.accessRequest.create({
    data: { requestedBy: session.user.id, requestedFor },
  });
  return NextResponse.json(accessRequest, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(requests);
}
`
    );
    console.log("[TemplateUpgrade] Added access-requests API route");
  }

  // --- 4. Remove hardcoded demo credentials from auth page + provisioning ---
  const authPagePath = path.join(sourceDir, "src", "app", "auth", "page.tsx");
  if (existsSync(authPagePath)) {
    let authPage = readFileSync(authPagePath, "utf-8");
    if (authPage.includes("go4it2026")) {
      authPage = authPage.replace(/\s*<div[^>]*>[^<]*go4it2026[^<]*<\/div>/, "");
      writeFileSync(authPagePath, authPage);
      console.log("[TemplateUpgrade] Removed demo credentials from auth page");
    }
  }

  const seedPath = path.join(sourceDir, "prisma", "seed.ts");
  if (existsSync(seedPath)) {
    let seed = readFileSync(seedPath, "utf-8");
    if (seed.includes('"go4it2026"')) {
      seed = seed.replace('"go4it2026"', 'process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID()');
      if (!seed.includes('import crypto')) {
        seed = seed.replace(/^(import .*)$/m, '$1\nimport crypto from "crypto";');
      }
      writeFileSync(seedPath, seed);
      console.log("[TemplateUpgrade] Updated seed.ts to use GO4IT_ADMIN_PASSWORD env var");
    }
  }

  const provisionPath2 = path.join(sourceDir, "prisma", "provision-users.ts");
  if (existsSync(provisionPath2)) {
    let provision = readFileSync(provisionPath2, "utf-8");
    let provisionPatched = false;
    if (provision.includes('"go4it2026"')) {
      provision = provision.replace(
        /const defaultPassword = await bcrypt\.hash\("go4it2026", 12\);/,
        `const adminPassword = process.env.GO4IT_ADMIN_PASSWORD;\n  const defaultPassword = adminPassword\n    ? await bcrypt.hash(adminPassword, 12)\n    : await bcrypt.hash(crypto.randomUUID(), 12);`
      );
      provisionPatched = true;
      console.log("[TemplateUpgrade] Updated provision-users.ts to use GO4IT_ADMIN_PASSWORD env var");
    }
    // Ensure admin user gets role: "admin"
    if (!provision.includes('role: "admin"') && provision.includes("admin@go4it.live")) {
      provision = provision.replace(
        /create:\s*\{[^}]*email:\s*"admin@go4it\.live"[^}]*\}/,
        (match) => match.includes("role") ? match : match.replace("}", ', role: "admin" }')
      );
      provision = provision.replace(
        /update:\s*\{[^}]*name:\s*"GO4IT Admin"[^}]*\}/,
        (match) => match.includes("role") ? match : match.replace("}", ', role: "admin" }')
      );
      provisionPatched = true;
      console.log("[TemplateUpgrade] Added role: admin to provision-users.ts admin upsert");
    }
    if (provisionPatched) writeFileSync(provisionPath2, provision);
  }

  // --- 5. Add team-sync API route if missing ---
  const teamSyncDir = path.join(sourceDir, "src", "app", "api", "team-sync");
  const teamSyncPath = path.join(teamSyncDir, "route.ts");
  if (!existsSync(teamSyncPath)) {
    mkdirSync(teamSyncDir, { recursive: true });
    writeFileSync(
      teamSyncPath,
      `import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: Request) {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-go4it-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.text();
  if (!verifySignature(body, signature, authSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { members } = JSON.parse(body) as {
    members: { email: string; name: string; assigned: boolean; passwordHash?: string; role?: string }[];
  };

  if (!Array.isArray(members)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results: string[] = [];
  for (const member of members) {
    const isAssigned = member.assigned !== false;
    const password = isAssigned
      ? (member.passwordHash || await bcrypt.hash(crypto.randomUUID(), 12))
      : await bcrypt.hash(crypto.randomUUID(), 12);
    const role = member.role || "member";

    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, isAssigned, ...(member.passwordHash ? { password } : {}) },
      create: { email: member.email, name: member.name, password, isAssigned, role },
    });
    results.push(\`\${member.email}: \${isAssigned ? "assigned" : "unassigned"}\`);
  }

  return NextResponse.json({ ok: true, results });
}
`
    );
    console.log("[TemplateUpgrade] Added team-sync API route");
  }

  // --- 6. Patch auth.config.ts: add isAssigned session enforcement ---
  if (existsSync(authConfigPath)) {
    let authConfig = readFileSync(authConfigPath, "utf-8");

    if (!authConfig.includes("isBlocked")) {
      // Add isAssigned re-check in jwt callback (blocks removed users mid-session)
      authConfig = authConfig.replace(
        /return token;\s*\},\s*async session/,
        `// Re-check isAssigned on every token verification — blocks removed users mid-session
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isAssigned: true },
          });
          if (dbUser && !dbUser.isAssigned) {
            token.isBlocked = true;
          } else {
            token.isBlocked = false;
          }
        } catch { /* fail open if DB unreachable */ }
      }
      return token;
    },
    async session`
      );

      // Add blocking check in session callback
      authConfig = authConfig.replace(
        "session.user.id = token.id as string;",
        `if (token.isBlocked) {
          session.user = undefined as any;
          return session;
        }
        session.user.id = token.id as string;`
      );

      writeFileSync(authConfigPath, authConfig);
      console.log("[TemplateUpgrade] Added isAssigned session enforcement to auth.config.ts");
    }
  }

  // --- 7. Rewrite start.sh with hash-based skip for fast cold starts ---
  const startShPath = path.join(sourceDir, "start.sh");
  if (existsSync(startShPath)) {
    const startSh = readFileSync(startShPath, "utf-8");
    if (!startSh.includes("schema unchanged")) {
      writeFileSync(startShPath, generateStartScript());
      console.log("[TemplateUpgrade] Rewrote start.sh with hash-based skip for fast cold starts");
    }
  }

  // --- 8. Add profile fields (username, title, image, profileColor, profileEmoji) ---
  if (existsSync(schemaPath)) {
    let schema = readFileSync(schemaPath, "utf-8");
    if (!schema.includes("profileColor")) {
      schema = schema.replace(
        /(isAssigned\s+Boolean\s+@default\(true\)[^\n]*\n)/,
        `  username       String?\n  title          String?\n  image          String?\n  profileColor   String?\n  profileEmoji   String?\n$1`
      );
      writeFileSync(schemaPath, schema);
      console.log("[TemplateUpgrade] Added profile fields to User model in schema");
    }
  }

  if (existsSync(provisionPath2)) {
    let provision = readFileSync(provisionPath2, "utf-8");
    if (!provision.includes("profileColor")) {
      // Expand member type to include profile fields
      provision = provision.replace(
        /username\?: string; title\?: string;/,
        "username?: string; title?: string; image?: string; profileColor?: string; profileEmoji?: string;"
      );
      // If the old-style type exists without username, add all profile fields
      if (!provision.includes("username")) {
        provision = provision.replace(
          /(name: string; email: string; role\?: string; passwordHash\?: string;)/,
          "$1 assigned?: boolean; username?: string; title?: string; image?: string; profileColor?: string; profileEmoji?: string;"
        );
      }
      // Add profile fields to upsert if not already present
      if (!provision.includes("profileColor") && provision.includes("profileFields")) {
        // Already has profileFields block — no-op
      } else if (!provision.includes("profileFields")) {
        provision = provision.replace(
          /const role = member\.role \|\| "member";/,
          `const role = member.role || "member";
    const profileFields = {
      username: member.username || null,
      title: member.title || null,
      image: member.image || null,
      profileColor: member.profileColor || null,
      profileEmoji: member.profileEmoji || null,
    };`
        );
        provision = provision.replace(
          /update:\s*\{[^}]*name:\s*member\.name[^}]*\}/,
          (match) => match.includes("profileFields") ? match : match.replace("}", ", ...profileFields }")
        );
        provision = provision.replace(
          /create:\s*\{[^}]*email:\s*member\.email[^}]*\}/,
          (match) => match.includes("profileFields") ? match : match.replace("}", ", ...profileFields }")
        );
      }
      writeFileSync(provisionPath2, provision);
      console.log("[TemplateUpgrade] Added profile fields to provision-users.ts");
    }
  }

  // Patch team-sync route to handle profile fields
  const teamSyncPath2 = path.join(sourceDir, "src", "app", "api", "team-sync", "route.ts");
  if (existsSync(teamSyncPath2)) {
    let teamSync = readFileSync(teamSyncPath2, "utf-8");
    if (!teamSync.includes("profileColor")) {
      // Expand member type
      teamSync = teamSync.replace(
        /members:\s*\{[^}]*email:\s*string;[^}]*role\?\s*:\s*string[^}]*\}/,
        (match) => match.includes("profileColor") ? match : match.replace("}", "; username?: string; title?: string; image?: string; profileColor?: string; profileEmoji?: string }")
      );
      // Add profile fields to upsert
      teamSync = teamSync.replace(
        /update:\s*\{[^}]*name:\s*member\.name[^}]*\}/,
        (match) => {
          if (match.includes("profileColor")) return match;
          return match.replace("}", ", username: member.username || null, title: member.title || null, image: member.image || null, profileColor: member.profileColor || null, profileEmoji: member.profileEmoji || null }");
        }
      );
      teamSync = teamSync.replace(
        /create:\s*\{[^}]*email:\s*member\.email[^}]*\}/,
        (match) => {
          if (match.includes("profileColor")) return match;
          return match.replace("}", ", username: member.username || null, title: member.title || null, image: member.image || null, profileColor: member.profileColor || null, profileEmoji: member.profileEmoji || null }");
        }
      );
      writeFileSync(teamSyncPath2, teamSync);
      console.log("[TemplateUpgrade] Added profile fields to team-sync route");
    }
  }

  // --- 9. Patch auth.config.ts: add SSO token verification ---
  if (existsSync(authConfigPath)) {
    let authConfig = readFileSync(authConfigPath, "utf-8");

    if (!authConfig.includes("ssoToken")) {
      // Add crypto import if missing
      if (!authConfig.includes("import crypto")) {
        authConfig = authConfig.replace(
          'import bcrypt from "bcryptjs";',
          'import bcrypt from "bcryptjs";\nimport crypto from "crypto";'
        );
      }

      // Add verifySsoToken function before export default
      authConfig = authConfig.replace(
        "export default {",
        `function verifySsoToken(token: string, email: string): boolean {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return false;
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expected = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  if (expected.length !== signature.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.email !== email) return false;
    if (Math.floor(Date.now() / 1000) > data.exp) return false;
    return true;
  } catch { return false; }
}

export default {`
      );

      // Add ssoToken to credentials schema
      authConfig = authConfig.replace(
        'password: { label: "Password", type: "password" },',
        'password: { label: "Password", type: "password" },\n        ssoToken: { label: "SSO Token", type: "text" },'
      );

      // Replace the authorize entry to handle SSO token
      authConfig = authConfig.replace(
        /if \(!credentials\?\.email \|\| !credentials\?\.password\) return null;/,
        `const email = credentials?.email as string;
        const ssoToken = credentials?.ssoToken as string;

        if (!email) return null;

        // SSO flow: verify HMAC token instead of password
        if (ssoToken) {
          if (!verifySsoToken(ssoToken, email)) return null;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.isAssigned) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }

        // Standard password flow
        if (!credentials?.password) return null;`
      );

      writeFileSync(authConfigPath, authConfig);
      console.log("[TemplateUpgrade] Added SSO token verification to auth.config.ts");
    }
  }

  // --- 10. Patch middleware: allow /sso path through ---
  const middlewarePath = path.join(sourceDir, "src", "middleware.ts");
  if (existsSync(middlewarePath)) {
    let middleware = readFileSync(middlewarePath, "utf-8");

    if (!middleware.includes('"/sso"')) {
      middleware = middleware.replace(
        'path.startsWith("/api")',
        'path.startsWith("/api") || path === "/sso"'
      );
      writeFileSync(middlewarePath, middleware);
      console.log("[TemplateUpgrade] Added /sso to middleware skip paths");
    }
  }

  // --- 11. Add SSO landing page if missing ---
  const ssoDir = path.join(sourceDir, "src", "app", "sso");
  const ssoPagePath = path.join(ssoDir, "page.tsx");
  if (!existsSync(ssoPagePath)) {
    mkdirSync(ssoDir, { recursive: true });
    writeFileSync(
      ssoPagePath,
      `"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

function SSOHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      router.replace("/auth");
      return;
    }

    signIn("credentials", {
      email,
      ssoToken: token,
      redirect: false,
    }).then((result) => {
      if (result?.ok) {
        router.replace("/");
      } else {
        setError(true);
        setTimeout(() => router.replace("/auth"), 2000);
      }
    });
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-500">Sign-in link expired. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Signing you in...</p>
      </div>
    </div>
  );
}

export default function SSOPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      }
    >
      <SSOHandler />
    </Suspense>
  );
}
`
    );
    console.log("[TemplateUpgrade] Added SSO landing page");
  }

  console.log("[TemplateUpgrade] Done");
}

// ============================================
// Main deploy function (go-live / full deploy)
// ============================================

export async function deployApp(
  orgAppId: string,
  orgSlug: string,
  sourceDir: string,
  teamMembers: { name: string; email: string; assigned?: boolean; passwordHash?: string }[],
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
        ["install", "--package-lock-only", "--ignore-scripts"],
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
          ["install", "--package-lock-only", "--legacy-peer-deps", "--ignore-scripts"],
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

    // ---- Upgrade template infrastructure (idempotent) ----
    upgradeTemplateInfra(sourceDir);

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
        authSecret,
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
  teamMembers: { name: string; email: string; assigned?: boolean; passwordHash?: string }[],
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

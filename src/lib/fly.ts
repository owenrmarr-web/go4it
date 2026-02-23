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
      // Insert before the app-specific marker if it exists
      if (schema.includes("// === Add app-specific models below this line ===")) {
        schema = schema.replace(
          "// === Add app-specific models below this line ===",
          accessRequestModel + "// === Add app-specific models below this line ==="
        );
      } else {
        // No marker — append to end
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
      // If the old-style type exists without username, replace entire members type declaration
      if (!provision.includes("username")) {
        provision = provision.replace(
          /const members:\s*\{[^}]+\}\[\]/,
          "const members: { name: string; email: string; role?: string; passwordHash?: string; assigned?: boolean; username?: string; title?: string; image?: string; profileColor?: string; profileEmoji?: string }[]"
        );
      }
      // Add profile fields to upsert if not already present
      if (!provision.includes("profileColor") && provision.includes("profileFields")) {
        // Already has profileFields block — no-op
      } else if (!provision.includes("profileFields")) {
        provision = provision.replace(
          /const role = member\.role \|\| "(?:member|Member)";/,
          (match) => `${match}
    const profileFields = {
      username: member.username || null,
      title: member.title || null,
      image: member.image || null,
      profileColor: member.profileColor || null,
      profileEmoji: member.profileEmoji || null,
    };`
        );
        // Only add ...profileFields if the variable was actually defined
        if (provision.includes("profileFields")) {
          provision = provision.replace(
            /update:\s*\{[^}]*name:\s*member\.name[^}]*\}/,
            (match) => match.includes("profileFields") ? match : match.replace("}", ", ...profileFields }")
          );
          provision = provision.replace(
            /create:\s*\{[^}]*email:\s*member\.email[^}]*\}/,
            (match) => match.includes("profileFields") ? match : match.replace("}", ", ...profileFields }")
          );
        }
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

  // --- 12. Inject dark mode tokens into globals.css ---
  const globalsCssPath = path.join(sourceDir, "src", "app", "globals.css");
  if (existsSync(globalsCssPath)) {
    let css = readFileSync(globalsCssPath, "utf-8");

    if (!css.includes("--g4-page")) {
      const tokenBlock = `
/* --- Semantic color tokens (light) --- */
:root {
  --g4-page: #f9fafb;
  --g4-card: #ffffff;
  --g4-elevated: #f3f4f6;
  --g4-input: #ffffff;
  --g4-skeleton: #e5e7eb;
  --g4-hover: #f9fafb;
  --g4-edge: #f3f4f6;
  --g4-edge-strong: #e5e7eb;
  --g4-divider: #f9fafb;
  --g4-fg: #111827;
  --g4-fg-secondary: #4b5563;
  --g4-fg-muted: #6b7280;
  --g4-fg-dim: #9ca3af;
  --g4-accent: #9333ea;
  --g4-accent-soft: #faf5ff;
  --g4-accent-fg: #7e22ce;
  --g4-backdrop: rgba(0, 0, 0, 0.5);
  --g4-blue: #eff6ff;
  --g4-blue-fg: #1d4ed8;
  --g4-green: #f0fdf4;
  --g4-green-fg: #15803d;
  --g4-red: #fef2f2;
  --g4-red-fg: #b91c1c;
  --g4-amber: #fffbeb;
  --g4-amber-fg: #b45309;
}

/* --- Dark theme --- */
.dark {
  --g4-page: #0f172a;
  --g4-card: #1e293b;
  --g4-elevated: #334155;
  --g4-input: #1e293b;
  --g4-skeleton: #334155;
  --g4-hover: rgba(255, 255, 255, 0.05);
  --g4-edge: #334155;
  --g4-edge-strong: #475569;
  --g4-divider: #1e293b;
  --g4-fg: #f1f5f9;
  --g4-fg-secondary: #cbd5e1;
  --g4-fg-muted: #94a3b8;
  --g4-fg-dim: #64748b;
  --g4-accent: #a855f7;
  --g4-accent-soft: rgba(168, 85, 247, 0.15);
  --g4-accent-fg: #c084fc;
  --g4-backdrop: rgba(0, 0, 0, 0.7);
  --g4-blue: rgba(59, 130, 246, 0.15);
  --g4-blue-fg: #93c5fd;
  --g4-green: rgba(34, 197, 94, 0.15);
  --g4-green-fg: #86efac;
  --g4-red: rgba(239, 68, 68, 0.15);
  --g4-red-fg: #fca5a5;
  --g4-amber: rgba(245, 158, 11, 0.15);
  --g4-amber-fg: #fcd34d;
  color-scheme: dark;
}

`;
      css = css.replace(
        '@import "tailwindcss";',
        '@import "tailwindcss";\n' + tokenBlock
      );

      const themeMapping = `  --color-page: var(--g4-page);
  --color-card: var(--g4-card);
  --color-elevated: var(--g4-elevated);
  --color-input-bg: var(--g4-input);
  --color-skeleton: var(--g4-skeleton);
  --color-hover: var(--g4-hover);
  --color-edge: var(--g4-edge);
  --color-edge-strong: var(--g4-edge-strong);
  --color-divider: var(--g4-divider);
  --color-fg: var(--g4-fg);
  --color-fg-secondary: var(--g4-fg-secondary);
  --color-fg-muted: var(--g4-fg-muted);
  --color-fg-dim: var(--g4-fg-dim);
  --color-accent: var(--g4-accent);
  --color-accent-soft: var(--g4-accent-soft);
  --color-accent-fg: var(--g4-accent-fg);
  --color-backdrop: var(--g4-backdrop);
  --color-status-blue: var(--g4-blue);
  --color-status-blue-fg: var(--g4-blue-fg);
  --color-status-green: var(--g4-green);
  --color-status-green-fg: var(--g4-green-fg);
  --color-status-red: var(--g4-red);
  --color-status-red-fg: var(--g4-red-fg);
  --color-status-amber: var(--g4-amber);
  --color-status-amber-fg: var(--g4-amber-fg);`;

      css = css.replace(
        /--font-sans: var\(--font-inter\);/,
        `--font-sans: var(--font-inter);\n\n${themeMapping}`
      );

      writeFileSync(globalsCssPath, css);
      console.log("[TemplateUpgrade] Injected dark mode tokens into globals.css");
    }
  }

  // --- 13. Add dark mode FOUC-prevention script to layout.tsx ---
  const layoutPath = path.join(sourceDir, "src", "app", "layout.tsx");
  if (existsSync(layoutPath)) {
    let layout = readFileSync(layoutPath, "utf-8");

    if (!layout.includes("go4it-theme")) {
      if (!layout.includes("suppressHydrationWarning")) {
        layout = layout.replace(
          '<html lang="en"',
          '<html lang="en" suppressHydrationWarning'
        );
      }

      const themeScript = `<script
          dangerouslySetInnerHTML={{
            __html: \`(function(){var t=localStorage.getItem('go4it-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()\`,
          }}
        />`;

      if (layout.includes("<head>")) {
        layout = layout.replace("<head>", `<head>\n        ${themeScript}`);
      } else {
        layout = layout.replace(
          /<html[^>]*>/,
          (match) => `${match}\n      <head>\n        ${themeScript}\n      </head>`
        );
      }

      layout = layout.replace("bg-gray-50", "bg-page text-fg");

      writeFileSync(layoutPath, layout);
      console.log("[TemplateUpgrade] Added dark mode script to layout.tsx");
    }
  }

  // --- 14. Create ThemeToggle component if missing ---
  const themeTogglePath = path.join(sourceDir, "src", "components", "ThemeToggle.tsx");
  if (!existsSync(themeTogglePath)) {
    writeFileSync(
      themeTogglePath,
      `"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("go4it-theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className={\`p-2 rounded-lg hover:bg-hover text-fg-muted transition-colors \${className}\`}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
`
    );
    console.log("[TemplateUpgrade] Created ThemeToggle component");
  }

  // --- 15. Add ThemeToggle to layout.tsx ---
  if (existsSync(layoutPath)) {
    let layout = readFileSync(layoutPath, "utf-8");

    if (!layout.includes("ThemeToggle")) {
      // Add import — handle both single and double quotes around 'sonner'
      const importLine = '\nimport ThemeToggle from "@/components/ThemeToggle";';
      const importAdded = layout.replace(
        /import\s*\{[^}]*Toaster[^}]*\}\s*from\s*['"]sonner['"];/,
        (match) => `${match}${importLine}`
      );

      // Only add JSX if the import was successfully added
      if (importAdded !== layout) {
        layout = importAdded;
        if (layout.includes("<Toaster")) {
          layout = layout.replace(
            /<Toaster[^/]*\/>/,
            (match) => `${match}\n          <ThemeToggle className="fixed bottom-4 right-4 z-50 bg-card border border-edge shadow-lg" />`
          );
        } else {
          layout = layout.replace(
            "</body>",
            '  <ThemeToggle className="fixed bottom-4 right-4 z-50 bg-card border border-edge shadow-lg" />\n      </body>'
          );
        }
        writeFileSync(layoutPath, layout);
        console.log("[TemplateUpgrade] Added ThemeToggle to layout.tsx");
      } else {
        console.log("[TemplateUpgrade] Could not find Toaster import in layout.tsx, skipping ThemeToggle");
      }
    }
  }

  // --- 16. Update auth page to use semantic tokens ---
  if (existsSync(authPagePath)) {
    let authPage = readFileSync(authPagePath, "utf-8");

    if (authPage.includes("bg-gray-50") && !authPage.includes("bg-page")) {
      authPage = authPage.replace(/bg-gray-50/g, "bg-page");
      authPage = authPage.replace(/bg-white(?=[\s"'])/g, "bg-card");
      authPage = authPage.replace(/border-gray-100/g, "border-edge");
      authPage = authPage.replace(/border-gray-200/g, "border-edge-strong");
      authPage = authPage.replace(/text-gray-700/g, "text-fg-secondary");
      authPage = authPage.replace(/text-gray-500/g, "text-fg-muted");
      authPage = authPage.replace(/text-purple-600/g, "text-accent-fg");
      authPage = authPage.replace(/focus:ring-purple-400/g, "focus:ring-accent");
      writeFileSync(authPagePath, authPage);
      console.log("[TemplateUpgrade] Updated auth page to use semantic tokens");
    }
  }

  // --- 17. Update SSO page to use semantic tokens ---
  const ssoPagePath3 = path.join(sourceDir, "src", "app", "sso", "page.tsx");
  if (existsSync(ssoPagePath3)) {
    let ssoPage = readFileSync(ssoPagePath3, "utf-8");

    if (ssoPage.includes("bg-gray-50") && !ssoPage.includes("bg-page")) {
      ssoPage = ssoPage.replace(/bg-gray-50/g, "bg-page");
      ssoPage = ssoPage.replace(/text-gray-500/g, "text-fg-muted");
      ssoPage = ssoPage.replace(/border-purple-600/g, "border-accent");
      writeFileSync(ssoPagePath3, ssoPage);
      console.log("[TemplateUpgrade] Updated SSO page to use semantic tokens");
    }
  }

  console.log("[TemplateUpgrade] Done");
}

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

    // ---- Upgrade template infrastructure (idempotent) ----
    upgradeTemplateInfra(sourceDir);

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

// ============================================
// App management helpers
// ============================================

export async function destroyApp(flyAppName: string): Promise<void> {
  await flyctl(["apps", "destroy", flyAppName, "--yes"]);
}

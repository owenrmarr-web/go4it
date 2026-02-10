import { FastifyInstance } from "fastify";
import { spawn } from "child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "../lib/prisma.js";

const FLYCTL_PATH =
  process.env.FLYCTL_PATH || `${process.env.HOME}/.fly/bin/flyctl`;
const FLY_REGION = process.env.FLY_REGION || "ord";

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

function patchAuthForPreview(sourceDir: string) {
  const authPath = path.join(sourceDir, "src", "auth.ts");
  if (!existsSync(authPath)) return;

  const content = readFileSync(authPath, "utf-8");
  if (content.includes("PREVIEW_MODE")) return;

  const patched = `import NextAuth from "next-auth";
import authConfig from "./auth.config";

const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

// In preview mode, return a fake session so all auth checks pass
const previewSession = {
  user: { id: "preview", email: "admin@example.com", name: "Preview User" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export const auth = process.env.PREVIEW_MODE === "true"
  ? async () => previewSession
  : nextAuth.auth;
`;

  writeFileSync(authPath, patched);
}

function generatePreviewFlyToml(appName: string): string {
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
  memory = "256mb"

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

export default async function previewRoute(app: FastifyInstance) {
  // POST /preview — deploy a preview machine
  app.post<{
    Body: { generationId: string };
  }>("/preview", async (request, reply) => {
    const { generationId } = request.body;

    if (!generationId) {
      return reply
        .status(400)
        .send({ error: "generationId is required" });
    }

    const gen = await prisma.generatedApp.findUnique({
      where: { id: generationId },
      select: { sourceDir: true, status: true },
    });

    if (!gen?.sourceDir) {
      return reply
        .status(404)
        .send({ error: "No source directory found" });
    }

    const sourceDir = gen.sourceDir;
    if (!existsSync(sourceDir)) {
      return reply
        .status(400)
        .send({ error: "Source directory does not exist on builder" });
    }

    const shortId = generationId.slice(0, 8);
    const previewAppName = `go4it-preview-${shortId}`;
    const authSecret = crypto.randomBytes(32).toString("hex");

    try {
      console.log(`[Preview ${generationId}] Starting preview deploy to ${previewAppName}`);

      // Patch auth for preview mode
      patchAuthForPreview(sourceDir);

      // Generate package-lock.json if missing
      const lockPath = path.join(sourceDir, "package-lock.json");
      if (!existsSync(lockPath)) {
        await runCommand("npm", ["install", "--package-lock-only"], {
          cwd: sourceDir,
        });
      }

      // Ensure public/ exists
      const publicDir = path.join(sourceDir, "public");
      if (!existsSync(publicDir)) {
        mkdirSync(publicDir, { recursive: true });
      }

      // Write preview-specific fly.toml
      writeFileSync(
        path.join(sourceDir, "fly.toml"),
        generatePreviewFlyToml(previewAppName)
      );

      // Write Dockerfile.fly (use Prisma 6 — generated apps use Prisma 6)
      const dockerfilePath = path.join(sourceDir, "Dockerfile.fly");
      if (!existsSync(dockerfilePath)) {
        writeFileSync(
          dockerfilePath,
          `FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

COPY . .
ENV DATABASE_URL="file:./build.db"
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "start.sh"]
`
        );
      }

      // Write start.sh
      const startShPath = path.join(sourceDir, "start.sh");
      if (!existsSync(startShPath)) {
        writeFileSync(
          startShPath,
          `#!/bin/sh
set -e
mkdir -p /data 2>/dev/null || true
npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues"

# Seed data for preview
if [ -f "prisma/seed.ts" ]; then
  npx tsx prisma/seed.ts 2>&1 || echo "Warning: seed failed"
fi

exec node server.js
`
        );
      }

      // Write .dockerignore
      writeFileSync(
        path.join(sourceDir, ".dockerignore"),
        `node_modules\n.next\n.git\n*.md\n.env*\ndev.db\n`
      );

      // Create preview Fly app
      const createResult = await flyctl([
        "apps",
        "create",
        previewAppName,
        "--json",
      ]);
      if (
        createResult.code !== 0 &&
        !createResult.stderr.includes("already exists") &&
        !createResult.stderr.includes("already been taken")
      ) {
        throw new Error(
          `Failed to create preview app: ${createResult.stderr}`
        );
      }

      // Create volume
      const volResult = await flyctl([
        "volumes",
        "create",
        "data",
        "--size",
        "1",
        "--region",
        FLY_REGION,
        "--app",
        previewAppName,
        "--yes",
      ]);
      if (
        volResult.code !== 0 &&
        !volResult.stderr.includes("already exists")
      ) {
        console.warn(
          `[Preview ${generationId}] Volume warning: ${volResult.stderr}`
        );
      }

      // Set secrets
      await flyctl([
        "secrets",
        "set",
        `AUTH_SECRET=${authSecret}`,
        `PREVIEW_MODE=true`,
        "--app",
        previewAppName,
        "--stage",
      ]);

      // Deploy
      console.log(`[Preview ${generationId}] Building and deploying preview...`);
      const deployResult = await flyctl(
        [
          "deploy",
          "--app",
          previewAppName,
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

      const url = `https://${previewAppName}.fly.dev`;
      console.log(`[Preview ${generationId}] Live at ${url}`);

      return reply.send({ url, flyAppName: previewAppName });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Preview deploy failed";
      console.error(`[Preview ${generationId}] Failed:`, errorMsg);
      return reply.status(500).send({ error: errorMsg });
    }
  });

  // DELETE /preview/:id — destroy a preview machine
  app.delete<{
    Params: { id: string };
  }>("/preview/:id", async (request, reply) => {
    const { id } = request.params;
    const shortId = id.slice(0, 8);
    const previewAppName = `go4it-preview-${shortId}`;

    try {
      console.log(`[Preview ${id}] Destroying preview app ${previewAppName}`);
      await flyctl(["apps", "destroy", previewAppName, "--yes"]);
      return reply.send({ destroyed: true, flyAppName: previewAppName });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to destroy preview";
      console.error(`[Preview ${id}] Destroy failed:`, errorMsg);
      return reply.status(500).send({ error: errorMsg });
    }
  });
}

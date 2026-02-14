import { FastifyInstance } from "fastify";
import { spawn, ChildProcess, execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import prisma from "../lib/prisma.js";

const PREVIEW_PORT = 4001;

// Active preview tracking — only one preview at a time
interface ActivePreview {
  generationId: string;
  port: number;
  process: ChildProcess | null;
  status: "starting" | "ready" | "failed";
  url?: string;
  error?: string;
}

let activePreview: ActivePreview | null = null;

export function getActivePreview(): ActivePreview | null {
  return activePreview;
}

export function getPreviewStatus(
  generationId: string
): { status: string; url?: string; error?: string } | null {
  if (!activePreview || activePreview.generationId !== generationId) {
    return null;
  }
  return {
    // Map "starting" to "deploying" for compatibility with the platform's polling
    status:
      activePreview.status === "starting" ? "deploying" : activePreview.status,
    url: activePreview.url,
    error: activePreview.error,
  };
}

export { PREVIEW_PORT };

function patchAuthForPreview(sourceDir: string) {
  const authPath = path.join(sourceDir, "src", "auth.ts");
  if (!existsSync(authPath)) return;

  const patched = `import NextAuth from "next-auth";
import authConfig from "./auth.config";

const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

// In preview mode, return a fake session so all auth checks pass
const previewSession = {
  user: { id: "preview", email: "admin@go4it.live", name: "Preview User", role: "admin" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export const auth = process.env.PREVIEW_MODE === "true"
  ? async () => previewSession
  : nextAuth.auth;
`;

  writeFileSync(authPath, patched);

  // Also patch middleware.ts — skip auth checks in preview mode
  const middlewarePath = path.join(sourceDir, "src", "middleware.ts");
  if (existsSync(middlewarePath)) {
    const mwContent = readFileSync(middlewarePath, "utf-8");
    const matcherMatch = mwContent.match(
      /export const config\s*=\s*(\{[\s\S]*?\});/
    );
    const matcherConfig = matcherMatch
      ? matcherMatch[1]
      : '{ matcher: ["/", "/m/:path*", "/settings/:path*"] }';

    const patchedMw = `import { NextResponse } from "next/server";

// Preview mode: skip all auth checks
export function middleware() {
  return NextResponse.next();
}

export const config = ${matcherConfig};
`;
    writeFileSync(middlewarePath, patchedMw);
  }
}

function killActivePreview(): Promise<void> {
  return new Promise((resolve) => {
    if (!activePreview?.process) {
      activePreview = null;
      resolve();
      return;
    }

    const proc = activePreview.process;
    const genId = activePreview.generationId;
    activePreview = null;

    const forceKillTimeout = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      resolve();
    }, 5000);

    proc.on("close", () => {
      clearTimeout(forceKillTimeout);
      console.log(`[Preview ${genId}] Process stopped`);
      resolve();
    });

    try {
      proc.kill("SIGTERM");
    } catch {
      clearTimeout(forceKillTimeout);
      resolve();
    }
  });
}

async function startPreviewLocal(generationId: string, sourceDir: string) {
  try {
    console.log(
      `[Preview ${generationId}] Starting fast local preview at port ${PREVIEW_PORT}`
    );

    // Kill any existing preview
    await killActivePreview();

    // Patch auth for preview mode
    patchAuthForPreview(sourceDir);

    // Ensure npm install is complete before starting dev server
    try {
      console.log(`[Preview ${generationId}] Ensuring dependencies are installed...`);
      execSync("npm install", { cwd: sourceDir, stdio: "pipe", timeout: 60000 });
    } catch {
      console.log(`[Preview ${generationId}] npm install failed (non-fatal)`);
    }

    // Clean env: remove builder-specific vars that would interfere with the preview app
    const {
      DATABASE_URL: _db,
      TURSO_AUTH_TOKEN: _turso,
      BUILDER_API_KEY: _bk,
      FLY_API_TOKEN: _fly,
      ANTHROPIC_API_KEY: _ak,
      PORT: _port,
      ...cleanEnv
    } = process.env;

    const child = spawn("npx", ["next", "dev", "-p", String(PREVIEW_PORT)], {
      cwd: sourceDir,
      env: {
        ...cleanEnv,
        PREVIEW_MODE: "true",
        NODE_ENV: "development",
        DATABASE_URL: "file:./dev.db",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    activePreview = {
      generationId,
      port: PREVIEW_PORT,
      process: child,
      status: "starting",
    };

    // Wait for dev server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (activePreview?.status === "starting") {
          // After 30s, assume ready (some apps compile slowly)
          console.log(`[Preview ${generationId}] Timeout — marking as ready`);
          activePreview.status = "ready";
          activePreview.url = `https://${process.env.FLY_APP_NAME || "go4it-builder"}.fly.dev`;
          resolve();
        }
      }, 30000);

      const onData = (data: Buffer) => {
        const text = data.toString();
        if (text.trim()) {
          console.log(`[Preview ${generationId}] ${text.trim()}`);
        }
        if (
          text.includes("Ready") ||
          text.includes("ready on") ||
          text.includes("started server") ||
          text.includes("✓ Ready")
        ) {
          if (activePreview?.status === "starting") {
            clearTimeout(timeout);
            activePreview.status = "ready";
            activePreview.url = `https://${process.env.FLY_APP_NAME || "go4it-builder"}.fly.dev`;
            console.log(
              `[Preview ${generationId}] Ready at ${activePreview.url}`
            );
            resolve();
          }
        }
      };

      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (activePreview?.generationId === generationId) {
          if (activePreview.status === "starting") {
            activePreview.status = "failed";
            activePreview.error = `Process exited with code ${code}`;
            reject(new Error(`Preview process exited with code ${code}`));
          }
          if (activePreview.status === "ready") {
            activePreview = null;
          }
        }
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        if (activePreview?.generationId === generationId) {
          activePreview.status = "failed";
          activePreview.error = err.message;
          reject(err);
        }
      });
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Preview failed";
    console.error(`[Preview ${generationId}] Failed:`, errorMsg);
    if (activePreview?.generationId === generationId) {
      activePreview.status = "failed";
      activePreview.error = errorMsg;
    }
  }
}

export default async function previewRoute(app: FastifyInstance) {
  // POST /preview — start fast local preview
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

    if (!existsSync(gen.sourceDir)) {
      return reply
        .status(400)
        .send({ error: "Source directory does not exist on builder" });
    }

    // Only allow preview after generation is fully complete (npm install, build validation, etc.)
    if (gen.status !== "COMPLETE") {
      return reply
        .status(400)
        .send({ error: "App is still generating. Please wait until generation completes." });
    }

    // Start preview in background
    startPreviewLocal(generationId, gen.sourceDir).catch((err) => {
      console.error(`[Preview] Unhandled error for ${generationId}:`, err);
    });

    return reply.status(202).send({ status: "deploying", generationId });
  });

  // GET /preview/:id/status — check preview status
  app.get<{
    Params: { id: string };
  }>("/preview/:id/status", async (request, reply) => {
    const { id } = request.params;
    const state = getPreviewStatus(id);

    if (!state) {
      return reply.status(404).send({ status: "unknown" });
    }

    return reply.send(state);
  });

  // DELETE /preview/:id — stop preview
  app.delete<{
    Params: { id: string };
  }>("/preview/:id", async (request, reply) => {
    const { id } = request.params;

    if (activePreview?.generationId === id) {
      console.log(`[Preview ${id}] Stopping preview`);
      await killActivePreview();
    }

    return reply.send({ destroyed: true });
  });
}

import { spawn, ChildProcess, execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

interface ActivePreview {
  process: ChildProcess;
  port: number;
  url: string;
  status: "starting" | "running" | "failed";
  error?: string;
}

const previews = new Map<string, ActivePreview>();
let nextPort = 4001;

export function getPreview(
  generationId: string
): { status: string; port?: number; url?: string; error?: string } | null {
  const preview = previews.get(generationId);
  if (!preview) return null;
  return {
    status: preview.status,
    port: preview.port,
    url: preview.url,
    error: preview.error,
  };
}

export async function startPreview(
  generationId: string,
  sourceDir: string
): Promise<{ port: number; url: string }> {
  // Kill existing preview for this app
  stopPreview(generationId);

  if (!existsSync(sourceDir)) {
    throw new Error("App source directory not found");
  }

  const port = nextPort++;
  const url = `http://localhost:${port}`;

  // Create .env if it doesn't exist
  const envPath = path.join(sourceDir, ".env");
  if (!existsSync(envPath)) {
    writeFileSync(
      envPath,
      'DATABASE_URL="file:./dev.db"\nAUTH_SECRET="preview-secret-key"\n'
    );
  }

  const env = { ...process.env, DATABASE_URL: "file:./dev.db" };

  // If node_modules already exists (pre-installed during generation), skip npm install
  const hasNodeModules = existsSync(path.join(sourceDir, "node_modules"));
  if (!hasNodeModules) {
    console.log(`[Preview ${generationId}] Installing dependencies...`);
    try {
      execSync("npm install", { cwd: sourceDir, stdio: "pipe", timeout: 120000 });
    } catch (err) {
      throw new Error(`npm install failed: ${(err as Error).message}`);
    }
  } else {
    console.log(`[Preview ${generationId}] Dependencies already installed, skipping npm install`);
  }

  // If dev.db already exists (pre-seeded during generation), skip setup
  const hasDb = existsSync(path.join(sourceDir, "dev.db"));
  if (!hasDb) {
    console.log(`[Preview ${generationId}] Setting up database...`);
    try {
      execSync("npx prisma db push --accept-data-loss", {
        cwd: sourceDir, stdio: "pipe", timeout: 30000, env,
      });
    } catch (err) {
      console.error(`[Preview ${generationId}] prisma db push failed (non-fatal):`, (err as Error).message);
    }

    const seedPath = path.join(sourceDir, "prisma", "seed.ts");
    if (existsSync(seedPath)) {
      try {
        execSync("npx tsx prisma/seed.ts", {
          cwd: sourceDir, stdio: "pipe", timeout: 30000, env,
        });
      } catch {
        console.log(`[Preview ${generationId}] Seed script failed (non-fatal)`);
      }
    }
  } else {
    console.log(`[Preview ${generationId}] Database already set up, skipping`);
  }

  // Patch auth.ts to skip authentication in preview mode
  patchAuthForPreview(generationId, sourceDir);

  // Start dev server with PREVIEW_MODE enabled
  console.log(`[Preview ${generationId}] Starting dev server on port ${port}`);
  const child = spawn("npx", ["next", "dev", "-p", String(port)], {
    cwd: sourceDir,
    env: { ...env, AUTH_SECRET: "preview-secret-key", PREVIEW_MODE: "true", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const preview: ActivePreview = { process: child, port, url, status: "starting" };
  previews.set(generationId, preview);

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (text.includes("Ready") || text.includes("ready") || text.includes(`localhost:${port}`)) {
      preview.status = "running";
      console.log(`[Preview ${generationId}] Ready at ${url}`);
    }
  });

  child.stderr?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (text.includes("Error") || text.includes("error")) {
      console.error(`[Preview ${generationId}] stderr: ${text.slice(0, 500)}`);
    }
  });

  child.on("close", (code) => {
    console.log(`[Preview ${generationId}] Process exited with code ${code}`);
    if (previews.get(generationId) === preview) {
      preview.status = "failed";
      preview.error = `Process exited with code ${code}`;
    }
  });

  child.on("error", (err) => {
    console.error(`[Preview ${generationId}] Spawn error:`, err.message);
    preview.status = "failed";
    preview.error = err.message;
  });

  // Wait for the server to be ready (up to 120 seconds)
  await waitForReady(port, 120000);
  preview.status = "running";

  return { port, url };
}

export function stopPreview(generationId: string): void {
  const preview = previews.get(generationId);
  if (!preview) return;

  try {
    if (preview.process.pid) {
      process.kill(-preview.process.pid);
    }
  } catch {
    try {
      preview.process.kill("SIGKILL");
    } catch {
      // Already gone
    }
  }

  previews.delete(generationId);
  console.log(`[Preview ${generationId}] Stopped`);
}

function patchAuthForPreview(generationId: string, sourceDir: string) {
  const authPath = path.join(sourceDir, "src", "auth.ts");
  if (!existsSync(authPath)) return;

  const content = readFileSync(authPath, "utf-8");
  if (content.includes("PREVIEW_MODE")) return; // Already patched

  // Replace auth.ts so auth() returns a fake session in preview mode
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
  console.log(`[Preview ${generationId}] Patched auth.ts for preview mode`);
}

async function waitForReady(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status === 307 || res.status === 302) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Preview app failed to start within timeout");
}

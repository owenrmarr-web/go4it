import { spawn, ChildProcess, execSync } from "child_process";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, cpSync } from "fs";
import path from "path";
import prisma from "./prisma";

export type GenerationStage =
  | "pending"
  | "designing"
  | "scaffolding"
  | "coding"
  | "database"
  | "finalizing"
  | "complete"
  | "failed";

export interface BusinessContext {
  businessContext?: string;
  companyName?: string;
  state?: string;
  country?: string;
  useCases?: string[];
}

export interface GenerationProgress {
  stage: GenerationStage;
  message: string;
  title?: string;
  description?: string;
  error?: string;
}

const STAGE_MESSAGES: Record<GenerationStage, string> = {
  pending: "Preparing to build your app...",
  designing: "Planning your app architecture...",
  scaffolding: "Creating project structure...",
  coding: "Building components and API routes...",
  database: "Setting up database and seed data...",
  finalizing: "Writing Dockerfile and finishing up...",
  complete: "Your app is ready!",
  failed: "Something went wrong.",
};

// In-memory progress store (single-server dev setup)
const progressStore = new Map<string, GenerationProgress>();
const processStore = new Map<string, ChildProcess>();
const installPromises = new Map<string, Promise<boolean>>();

// Timed stage timers for early stages (auto-advance designing → scaffolding → coding)
const stageTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

export function getProgress(generationId: string): GenerationProgress {
  return (
    progressStore.get(generationId) ?? {
      stage: "pending",
      message: STAGE_MESSAGES.pending,
    }
  );
}

// Start the timed early-stage progression: designing (8s) → scaffolding (10s) → coding
function startTimedStages(generationId: string) {
  // Clear any existing timers
  const existing = stageTimers.get(generationId);
  if (existing) existing.forEach(clearTimeout);

  // Start at "designing" immediately
  updateProgress(generationId, "designing");

  const timers = [
    setTimeout(() => {
      const p = progressStore.get(generationId);
      if (p && (p.stage === "designing" || p.stage === "pending")) {
        updateProgress(generationId, "scaffolding");
      }
    }, 8000),
    setTimeout(() => {
      const p = progressStore.get(generationId);
      if (p && p.stage === "scaffolding") {
        updateProgress(generationId, "coding");
      }
    }, 18000), // 8s designing + 10s scaffolding
  ];
  stageTimers.set(generationId, timers);
}

function updateProgress(
  generationId: string,
  stage: GenerationStage,
  extra?: Partial<GenerationProgress>
) {
  const progress: GenerationProgress = {
    stage,
    message: STAGE_MESSAGES[stage],
    ...extra,
  };
  progressStore.set(generationId, progress);
}

function getProjectRoot(): string {
  // In dev, this is the go4it repo root
  return path.resolve(process.cwd());
}

function getAppsDir(): string {
  return path.join(getProjectRoot(), "apps");
}

function getPlaybookPath(): string {
  return path.join(getProjectRoot(), "playbook", "CLAUDE.md");
}

function getTemplatePath(): string {
  return path.join(getProjectRoot(), "playbook", "template");
}

// Shared CLI runner used by both startGeneration and startIteration
function runClaudeCLI(
  generationId: string,
  workspaceDir: string,
  cliArgs: string[],
  onComplete: (meta: { title: string; description: string }) => Promise<void>,
  onError: (errorMsg: string) => Promise<void>
) {
  console.log(`[Generator ${generationId}] Spawning CLI in ${workspaceDir}`);
  console.log(`[Generator ${generationId}] Args: npx ${cliArgs.join(" ").slice(0, 200)}...`);
  console.log(`[Generator ${generationId}] ANTHROPIC_API_KEY set: ${!!process.env.ANTHROPIC_API_KEY}`);

  const child = spawn("npx", cliArgs, {
    cwd: workspaceDir,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      CLAUDECODE: undefined, // Prevent nested session detection
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  processStore.set(generationId, child);

  let stderrBuffer = "";
  let stdoutBuffer = "";
  let eventCount = 0;

  child.stdout.on("data", (data: Buffer) => {
    const text = data.toString();
    stdoutBuffer += text;
    const lines = text.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        eventCount++;
        handleStreamEvent(generationId, event);
      } catch {
        checkForStageMarkers(generationId, line);
      }
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    const text = data.toString();
    stderrBuffer += text;
    // Log stderr lines as they arrive
    if (text.trim()) {
      console.log(`[Generator ${generationId}] stderr: ${text.trim().slice(0, 500)}`);
    }
  });

  child.on("close", async (code) => {
    processStore.delete(generationId);

    // List workspace files for debugging
    try {
      const files = readdirSync(workspaceDir);
      console.log(`[Generator ${generationId}] Exit code: ${code}, events: ${eventCount}, workspace files: ${files.length} (${files.slice(0, 10).join(", ")})`);
    } catch {
      console.log(`[Generator ${generationId}] Exit code: ${code}, events: ${eventCount}, workspace dir read failed`);
    }

    if (code === 0) {
      const appMeta = extractAppMetadata(workspaceDir);
      console.log(`[Generator ${generationId}] Complete: title="${appMeta.title}", description="${appMeta.description?.slice(0, 100)}"`);

      // Pre-install dependencies so preview is instant
      updateProgress(generationId, "finalizing", { message: "Installing dependencies..." });
      await prepareForPreview(generationId, workspaceDir);

      updateProgress(generationId, "complete", {
        title: appMeta.title,
        description: appMeta.description,
      });
      await onComplete(appMeta);
    } else {
      const errorMsg = stderrBuffer.trim() || stdoutBuffer.trim() || `Process exited with code ${code}`;
      console.error(`[Generator ${generationId}] Failed with code ${code}`);
      console.error(`[Generator ${generationId}] stderr:`, stderrBuffer.slice(0, 2000));
      console.error(`[Generator ${generationId}] stdout:`, stdoutBuffer.slice(0, 2000));
      updateProgress(generationId, "failed", { error: errorMsg });
      await onError(errorMsg);
    }
  });

  child.on("error", async (err) => {
    processStore.delete(generationId);
    const errorMsg = (err as NodeJS.ErrnoException).code === "ENOENT"
      ? "Claude Code CLI (npx) not found. App generation requires a local development environment."
      : err.message;
    console.error(`[Generator ${generationId}] Spawn error:`, errorMsg);
    updateProgress(generationId, "failed", { error: errorMsg });
    await onError(errorMsg);
  });
}

function buildEnrichedPrompt(
  rawPrompt: string,
  context?: BusinessContext
): string {
  if (!context) return rawPrompt;

  const parts: string[] = [];
  if (context.businessContext) parts.push(`Business: ${context.businessContext}`);
  if (context.companyName) parts.push(`Company name: ${context.companyName}`);
  if (context.state && context.country)
    parts.push(`Location: ${context.state}, ${context.country}`);
  else if (context.country) parts.push(`Location: ${context.country}`);
  if (context.useCases?.length)
    parts.push(`Industry focus: ${context.useCases.join(", ")}`);

  if (parts.length === 0) return rawPrompt;

  return [
    "[BUSINESS CONTEXT]",
    ...parts,
    "[END BUSINESS CONTEXT]",
    "",
    rawPrompt,
  ].join("\n");
}

function buildCLIArgs(prompt: string, useContinue: boolean): string[] {
  const args = [
    "--yes",
    "@anthropic-ai/claude-code",
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--dangerously-skip-permissions",
    "--model",
    process.env.CLAUDE_MODEL || "sonnet",
  ];
  if (useContinue) {
    args.splice(4, 0, "--continue"); // Insert after prompt
  }
  return args;
}

export async function startGeneration(
  generationId: string,
  prompt: string,
  context?: BusinessContext
): Promise<void> {
  const workspaceDir = path.join(getAppsDir(), generationId);

  // Create workspace directory
  mkdirSync(workspaceDir, { recursive: true });

  // Copy starter template into workspace (config, auth, DB, UI boilerplate)
  const templateDir = getTemplatePath();
  if (existsSync(templateDir)) {
    cpSync(templateDir, workspaceDir, { recursive: true });
    console.log(`[Generator ${generationId}] Template copied to workspace`);
  }

  // Copy playbook into workspace as CLAUDE.md
  const playbookContent = readFileSync(getPlaybookPath(), "utf-8");
  writeFileSync(path.join(workspaceDir, "CLAUDE.md"), playbookContent);

  // Create .env for the generated app
  const envPath = path.join(workspaceDir, ".env");
  if (!existsSync(envPath)) {
    writeFileSync(envPath, 'DATABASE_URL="file:./dev.db"\nAUTH_SECRET="preview-secret-key"\n');
  }

  // Start npm install in parallel with Claude Code (template deps ~30-60s)
  const installPromise = new Promise<boolean>((resolve) => {
    console.log(`[Generator ${generationId}] Starting parallel npm install...`);
    const installChild = spawn("npm", ["install"], {
      cwd: workspaceDir,
      stdio: "pipe",
    });
    installChild.on("close", (code) => {
      console.log(`[Generator ${generationId}] Parallel npm install finished (code ${code})`);
      resolve(code === 0);
    });
    installChild.on("error", () => resolve(false));
  });
  installPromises.set(generationId, installPromise);

  // Update DB status
  await prisma.generatedApp.update({
    where: { id: generationId },
    data: { status: "GENERATING", sourceDir: workspaceDir },
  });

  // Start timed early-stage progression (designing 8s → scaffolding 10s → coding)
  startTimedStages(generationId);

  const enrichedPrompt = buildEnrichedPrompt(prompt, context);

  runClaudeCLI(
    generationId,
    workspaceDir,
    buildCLIArgs(enrichedPrompt, false),
    async (appMeta) => {
      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "COMPLETE",
          title: appMeta.title,
          description: appMeta.description,
        },
      });
    },
    async (errorMsg) => {
      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "FAILED",
          error: errorMsg.slice(0, 1000),
        },
      });
    }
  );
}

export async function startIteration(
  generationId: string,
  iterationId: string,
  prompt: string
): Promise<void> {
  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id: generationId },
    select: { sourceDir: true },
  });

  if (!generatedApp?.sourceDir) {
    throw new Error(`No sourceDir found for generation ${generationId}`);
  }

  const workspaceDir = generatedApp.sourceDir;

  await prisma.appIteration.update({
    where: { id: iterationId },
    data: { status: "GENERATING" },
  });

  // Start timed early-stage progression (designing 8s → scaffolding 10s → coding)
  startTimedStages(generationId);

  runClaudeCLI(
    generationId,
    workspaceDir,
    buildCLIArgs(prompt, true),
    async (appMeta) => {
      await prisma.appIteration.update({
        where: { id: iterationId },
        data: { status: "COMPLETE" },
      });
      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "COMPLETE",
          title: appMeta.title,
          description: appMeta.description,
        },
      });
    },
    async (errorMsg) => {
      await prisma.appIteration.update({
        where: { id: iterationId },
        data: { status: "FAILED", error: errorMsg.slice(0, 1000) },
      });
      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "FAILED",
          error: errorMsg.slice(0, 1000),
        },
      });
    }
  );
}

function handleStreamEvent(generationId: string, event: Record<string, unknown>) {
  if (event.type === "assistant" && event.message) {
    const msg = event.message as Record<string, unknown>;
    if (msg.content && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if ((block as Record<string, unknown>).type === "text") {
          checkForStageMarkers(
            generationId,
            (block as Record<string, unknown>).text as string
          );
        }
      }
    }
  }

  if (event.type === "result" && event.result) {
    const result = event.result as string;
    checkForStageMarkers(generationId, result);
  }
}

function checkForStageMarkers(generationId: string, text: string) {
  const markerPattern = /\[GO4IT:STAGE:(\w+)\]/g;
  let match;
  while ((match = markerPattern.exec(text)) !== null) {
    const stage = match[1] as GenerationStage;
    if (stage in STAGE_MESSAGES) {
      updateProgress(generationId, stage);
    }
  }
}

function extractAppMetadata(workspaceDir: string): {
  title: string;
  description: string;
} {
  const pkgPath = path.join(workspaceDir, "package.json");
  let title = "Generated App";
  let description = "";

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) {
        title = pkg.name
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
      if (pkg.description) {
        description = pkg.description;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { title, description };
}

async function prepareForPreview(generationId: string, workspaceDir: string) {
  const env = { ...process.env, DATABASE_URL: "file:./dev.db" };

  // Wait for the parallel npm install that started with generation
  const parallelInstall = installPromises.get(generationId);
  if (parallelInstall) {
    console.log(`[Generator ${generationId}] Waiting for parallel npm install to finish...`);
    const success = await parallelInstall;
    installPromises.delete(generationId);

    if (success) {
      // Run incremental install in case Claude added new deps to package.json
      try {
        console.log(`[Generator ${generationId}] Running incremental npm install...`);
        execSync("npm install", { cwd: workspaceDir, stdio: "pipe", timeout: 60000 });
      } catch (err) {
        console.error(`[Generator ${generationId}] Incremental npm install failed (non-fatal):`, (err as Error).message);
      }
    } else {
      // Parallel install failed, try a fresh install
      try {
        console.log(`[Generator ${generationId}] Parallel install failed, running full npm install...`);
        execSync("npm install", { cwd: workspaceDir, stdio: "pipe", timeout: 120000 });
      } catch (err) {
        console.error(`[Generator ${generationId}] npm install failed (non-fatal):`, (err as Error).message);
        return;
      }
    }
  } else {
    // No parallel install (e.g. iteration), run fresh
    try {
      execSync("npm install", { cwd: workspaceDir, stdio: "pipe", timeout: 120000 });
    } catch (err) {
      console.error(`[Generator ${generationId}] npm install failed (non-fatal):`, (err as Error).message);
      return;
    }
  }

  // prisma db push
  try {
    execSync("npx prisma db push --accept-data-loss", {
      cwd: workspaceDir, stdio: "pipe", timeout: 30000, env,
    });
  } catch {
    console.log(`[Generator ${generationId}] prisma db push failed (non-fatal)`);
  }

  // Seed data
  const seedPath = path.join(workspaceDir, "prisma", "seed.ts");
  if (existsSync(seedPath)) {
    try {
      execSync("npx tsx prisma/seed.ts", {
        cwd: workspaceDir, stdio: "pipe", timeout: 30000, env,
      });
    } catch {
      console.log(`[Generator ${generationId}] Seed failed (non-fatal)`);
    }
  }
}

export function cleanupProgress(generationId: string) {
  progressStore.delete(generationId);
  const timers = stageTimers.get(generationId);
  if (timers) {
    timers.forEach(clearTimeout);
    stageTimers.delete(generationId);
  }
}

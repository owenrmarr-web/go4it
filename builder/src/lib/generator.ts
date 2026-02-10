import { spawn, ChildProcess, execSync } from "child_process";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  cpSync,
} from "fs";
import path from "path";
import prisma from "./prisma.js";

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

// Track child processes for cleanup (in-memory only, builder is long-running)
const processStore = new Map<string, ChildProcess>();
const installPromises = new Map<string, Promise<boolean>>();

// Track active generation count for health endpoint
let activeJobs = 0;
export function getActiveJobCount(): number {
  return activeJobs;
}

const APPS_DIR = process.env.APPS_DIR || "/data/apps";

// Retry a Prisma update with backoff — handles Turso replication delay
// between Vercel (writes record) and Fly.io builder (reads/updates it)
async function retryUpdate(
  generationId: string,
  data: Record<string, string | undefined>,
  maxRetries = 5,
  delayMs = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.generatedApp.update({
        where: { id: generationId },
        data,
      });
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(
        `[Generator ${generationId}] Record not found yet, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function getAppsDir(): string {
  return APPS_DIR;
}

function getPlaybookPath(): string {
  // Playbook is baked into the Docker image at /app/playbook/CLAUDE.md
  return path.resolve("playbook", "CLAUDE.md");
}

function getTemplatePath(): string {
  return path.resolve("playbook", "template");
}

// Write progress to Turso DB instead of in-memory store
async function updateProgress(
  generationId: string,
  stage: GenerationStage,
  extra?: { title?: string; description?: string; error?: string }
) {
  try {
    const data: Record<string, string | undefined> = {
      currentStage: stage,
    };
    // Only update status field for terminal/important stages
    if (stage === "complete") {
      data.status = "COMPLETE";
      if (extra?.title) data.title = extra.title;
      if (extra?.description) data.description = extra.description;
    } else if (stage === "failed") {
      data.status = "FAILED";
      if (extra?.error) data.error = extra.error;
    } else if (stage !== "pending") {
      data.status = "GENERATING";
    }

    await prisma.generatedApp.update({
      where: { id: generationId },
      data,
    });
  } catch (err) {
    console.error(
      `[Generator ${generationId}] Failed to update progress:`,
      err
    );
  }
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
  console.log(
    `[Generator ${generationId}] Args: npx ${cliArgs.join(" ").slice(0, 200)}...`
  );
  console.log(
    `[Generator ${generationId}] ANTHROPIC_API_KEY set: ${!!process.env.ANTHROPIC_API_KEY}`
  );

  const child = spawn("npx", cliArgs, {
    cwd: workspaceDir,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
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
    if (text.trim()) {
      console.log(
        `[Generator ${generationId}] stderr: ${text.trim().slice(0, 500)}`
      );
    }
  });

  child.on("close", async (code) => {
    processStore.delete(generationId);
    activeJobs--;

    try {
      const files = readdirSync(workspaceDir);
      console.log(
        `[Generator ${generationId}] Exit code: ${code}, events: ${eventCount}, workspace files: ${files.length} (${files.slice(0, 10).join(", ")})`
      );
    } catch {
      console.log(
        `[Generator ${generationId}] Exit code: ${code}, events: ${eventCount}, workspace dir read failed`
      );
    }

    if (code === 0) {
      const appMeta = extractAppMetadata(workspaceDir);
      console.log(
        `[Generator ${generationId}] Complete: title="${appMeta.title}", description="${appMeta.description?.slice(0, 100)}"`
      );

      await updateProgress(generationId, "finalizing");
      await prepareForPreview(generationId, workspaceDir);

      await updateProgress(generationId, "complete", {
        title: appMeta.title,
        description: appMeta.description,
      });
      await onComplete(appMeta);
    } else {
      const errorMsg =
        stderrBuffer.trim() ||
        stdoutBuffer.trim() ||
        `Process exited with code ${code}`;
      console.error(`[Generator ${generationId}] Failed with code ${code}`);
      console.error(
        `[Generator ${generationId}] stderr:`,
        stderrBuffer.slice(0, 2000)
      );
      console.error(
        `[Generator ${generationId}] stdout:`,
        stdoutBuffer.slice(0, 2000)
      );
      await updateProgress(generationId, "failed", { error: errorMsg });
      await onError(errorMsg);
    }
  });

  child.on("error", async (err) => {
    processStore.delete(generationId);
    activeJobs--;
    const errorMsg =
      (err as NodeJS.ErrnoException).code === "ENOENT"
        ? "Claude Code CLI (npx) not found."
        : err.message;
    console.error(`[Generator ${generationId}] Spawn error:`, errorMsg);
    await updateProgress(generationId, "failed", { error: errorMsg });
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
    args.splice(4, 0, "--continue");
  }
  return args;
}

export async function startGeneration(
  generationId: string,
  prompt: string,
  context?: BusinessContext
): Promise<void> {
  activeJobs++;
  const workspaceDir = path.join(getAppsDir(), generationId);

  mkdirSync(workspaceDir, { recursive: true });

  // Copy starter template
  const templateDir = getTemplatePath();
  if (existsSync(templateDir)) {
    cpSync(templateDir, workspaceDir, { recursive: true });
    console.log(`[Generator ${generationId}] Template copied to workspace`);
  }

  // Copy playbook as CLAUDE.md
  const playbookContent = readFileSync(getPlaybookPath(), "utf-8");
  writeFileSync(path.join(workspaceDir, "CLAUDE.md"), playbookContent);

  // Create .env
  const envPath = path.join(workspaceDir, ".env");
  if (!existsSync(envPath)) {
    writeFileSync(
      envPath,
      'DATABASE_URL="file:./dev.db"\nAUTH_SECRET="preview-secret-key"\n'
    );
  }

  // Parallel npm install
  const installPromise = new Promise<boolean>((resolve) => {
    console.log(`[Generator ${generationId}] Starting parallel npm install...`);
    const installChild = spawn("npm", ["install"], {
      cwd: workspaceDir,
      stdio: "pipe",
    });
    installChild.on("close", (code) => {
      console.log(
        `[Generator ${generationId}] Parallel npm install finished (code ${code})`
      );
      resolve(code === 0);
    });
    installChild.on("error", () => resolve(false));
  });
  installPromises.set(generationId, installPromise);

  // Update DB: status GENERATING + sourceDir on builder volume
  // Uses retry because of Turso replication delay — the record was just created by Vercel
  await retryUpdate(generationId, { status: "GENERATING", sourceDir: workspaceDir });

  await updateProgress(generationId, "pending");

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
  activeJobs++;

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id: generationId },
    select: { sourceDir: true },
  });

  if (!generatedApp?.sourceDir) {
    activeJobs--;
    throw new Error(`No sourceDir found for generation ${generationId}`);
  }

  const workspaceDir = generatedApp.sourceDir;

  await prisma.appIteration.update({
    where: { id: iterationId },
    data: { status: "GENERATING" },
  });

  await updateProgress(generationId, "pending");

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

function handleStreamEvent(
  generationId: string,
  event: Record<string, unknown>
) {
  if (event.type === "assistant" && event.message) {
    const msg = event.message as Record<string, unknown>;
    if (msg.content && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        const b = block as Record<string, unknown>;
        if (b.type === "text") {
          checkForStageMarkers(generationId, b.text as string);
        }
        if (b.type === "tool_use") {
          const detail = extractToolDetail(
            b.name as string,
            b.input as Record<string, unknown>
          );
          if (detail) updateDetail(generationId, detail);
        }
      }
    }
  }

  if (event.type === "result" && event.result) {
    const result = event.result as string;
    checkForStageMarkers(generationId, result);
  }
}

function extractToolDetail(
  toolName: string,
  input: Record<string, unknown>
): string | null {
  const filePath = (input?.file_path as string) || (input?.path as string);
  const shortPath = filePath
    ? filePath.replace(/^.*\/apps\/[^/]+\//, "")
    : null;

  switch (toolName) {
    case "Write":
      return shortPath ? `Creating ${shortPath}` : "Creating file...";
    case "Edit":
      return shortPath ? `Editing ${shortPath}` : "Editing file...";
    case "Read":
      return shortPath ? `Reading ${shortPath}` : "Reading file...";
    case "Bash":
      return (input?.description as string)?.slice(0, 80) || "Running command...";
    case "Glob":
    case "Grep":
      return "Searching codebase...";
    default:
      return null;
  }
}

// Fire-and-forget detail text update
function updateDetail(generationId: string, detail: string) {
  prisma.generatedApp
    .update({
      where: { id: generationId },
      data: { currentDetail: detail },
    })
    .catch(() => {});
}

function checkForStageMarkers(generationId: string, text: string) {
  const markerPattern = /\[GO4IT:STAGE:(\w+)\]/g;
  let match;
  while ((match = markerPattern.exec(text)) !== null) {
    const stage = match[1] as GenerationStage;
    if (stage in STAGE_MESSAGES) {
      // Fire-and-forget DB write for stage updates
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

async function prepareForPreview(
  generationId: string,
  workspaceDir: string
) {
  const env = { ...process.env, DATABASE_URL: "file:./dev.db" };

  const parallelInstall = installPromises.get(generationId);
  if (parallelInstall) {
    console.log(
      `[Generator ${generationId}] Waiting for parallel npm install to finish...`
    );
    const success = await parallelInstall;
    installPromises.delete(generationId);

    if (success) {
      try {
        console.log(
          `[Generator ${generationId}] Running incremental npm install...`
        );
        execSync("npm install", {
          cwd: workspaceDir,
          stdio: "pipe",
          timeout: 60000,
        });
      } catch (err) {
        console.error(
          `[Generator ${generationId}] Incremental npm install failed (non-fatal):`,
          (err as Error).message
        );
      }
    } else {
      try {
        console.log(
          `[Generator ${generationId}] Parallel install failed, running full npm install...`
        );
        execSync("npm install", {
          cwd: workspaceDir,
          stdio: "pipe",
          timeout: 120000,
        });
      } catch (err) {
        console.error(
          `[Generator ${generationId}] npm install failed (non-fatal):`,
          (err as Error).message
        );
        return;
      }
    }
  } else {
    try {
      execSync("npm install", {
        cwd: workspaceDir,
        stdio: "pipe",
        timeout: 120000,
      });
    } catch (err) {
      console.error(
        `[Generator ${generationId}] npm install failed (non-fatal):`,
        (err as Error).message
      );
      return;
    }
  }

  // prisma db push
  try {
    execSync("npx prisma db push --accept-data-loss", {
      cwd: workspaceDir,
      stdio: "pipe",
      timeout: 30000,
      env,
    });
  } catch {
    console.log(`[Generator ${generationId}] prisma db push failed (non-fatal)`);
  }

  // Seed data
  const seedPath = path.join(workspaceDir, "prisma", "seed.ts");
  if (existsSync(seedPath)) {
    try {
      execSync("npx tsx prisma/seed.ts", {
        cwd: workspaceDir,
        stdio: "pipe",
        timeout: 30000,
        env,
      });
    } catch {
      console.log(`[Generator ${generationId}] Seed failed (non-fatal)`);
    }
  }
}

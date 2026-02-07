import { spawn, ChildProcess } from "child_process";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "fs";
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

export function getProgress(generationId: string): GenerationProgress {
  return (
    progressStore.get(generationId) ?? {
      stage: "pending",
      message: STAGE_MESSAGES.pending,
    }
  );
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

  const child = spawn("/usr/local/bin/npx", cliArgs, {
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
    console.error(`[Generator ${generationId}] Spawn error:`, err.message);
    updateProgress(generationId, "failed", { error: err.message });
    await onError(err.message);
  });
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
  prompt: string
): Promise<void> {
  const workspaceDir = path.join(getAppsDir(), generationId);

  // Create workspace directory
  mkdirSync(workspaceDir, { recursive: true });

  // Copy playbook into workspace as CLAUDE.md
  const playbookContent = readFileSync(getPlaybookPath(), "utf-8");
  writeFileSync(path.join(workspaceDir, "CLAUDE.md"), playbookContent);

  // Update DB status
  await prisma.generatedApp.update({
    where: { id: generationId },
    data: { status: "GENERATING", sourceDir: workspaceDir },
  });

  updateProgress(generationId, "pending");

  runClaudeCLI(
    generationId,
    workspaceDir,
    buildCLIArgs(prompt, false),
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

  updateProgress(generationId, "pending");

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

export function cleanupProgress(generationId: string) {
  progressStore.delete(generationId);
}

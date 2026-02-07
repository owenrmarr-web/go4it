import { spawn, ChildProcess } from "child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
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

  // Spawn Claude Code CLI
  const child = spawn(
    "npx",
    [
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
    ],
    {
      cwd: workspaceDir,
      env: {
        ...process.env,
        // Ensure Claude Code can find the API key
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  processStore.set(generationId, child);

  let stderrBuffer = "";
  let stdoutBuffer = "";

  // Parse stdout for stream-json events
  child.stdout.on("data", (data: Buffer) => {
    const text = data.toString();
    stdoutBuffer += text;
    const lines = text.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        handleStreamEvent(generationId, event);
      } catch {
        // Not JSON — check for raw stage markers in text
        checkForStageMarkers(generationId, line);
      }
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    stderrBuffer += data.toString();
  });

  child.on("close", async (code) => {
    processStore.delete(generationId);

    if (code === 0) {
      // Extract title from generated package.json if available
      const appMeta = extractAppMetadata(workspaceDir);

      updateProgress(generationId, "complete", {
        title: appMeta.title,
        description: appMeta.description,
      });

      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "COMPLETE",
          title: appMeta.title,
          description: appMeta.description,
        },
      });
    } else {
      const errorMsg = stderrBuffer.trim() || stdoutBuffer.trim() || `Process exited with code ${code}`;
      console.error(`[Generator ${generationId}] Failed with code ${code}`);
      console.error(`[Generator ${generationId}] stderr:`, stderrBuffer);
      console.error(`[Generator ${generationId}] stdout:`, stdoutBuffer.slice(0, 2000));
      updateProgress(generationId, "failed", { error: errorMsg });

      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "FAILED",
          error: errorMsg.slice(0, 1000),
        },
      });
    }
  });

  child.on("error", async (err) => {
    processStore.delete(generationId);
    updateProgress(generationId, "failed", { error: err.message });

    await prisma.generatedApp.update({
      where: { id: generationId },
      data: {
        status: "FAILED",
        error: err.message.slice(0, 1000),
      },
    });
  });
}

function handleStreamEvent(generationId: string, event: Record<string, unknown>) {
  // stream-json events have different types
  // Look for text content containing stage markers
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

  // Also check result events
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
  // Try to read package.json for app name
  const pkgPath = path.join(workspaceDir, "package.json");
  let title = "Generated App";
  let description = "";

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) {
        // Convert package name to title case: "leadflow-crm" -> "Leadflow Crm"
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

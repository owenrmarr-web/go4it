import { spawn, ChildProcess, execSync } from "child_process";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  cpSync,
  unlinkSync,
  rmSync,
} from "fs";
import path from "path";
import prisma from "./prisma.js";
import { preCreateFlyInfra, deployPreviewApp } from "./fly.js";
import { captureScreenshot } from "./screenshot.js";

export type GenerationStage =
  | "pending"
  | "designing"
  | "scaffolding"
  | "coding"
  | "database"
  | "finalizing"
  | "deploying"
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
  finalizing: "Validating build and preparing preview...",
  deploying: "Deploying your app preview...",
  complete: "Your app is ready!",
  failed: "Something went wrong.",
};

// Track child processes for cleanup (in-memory only, builder is long-running)
const processStore = new Map<string, ChildProcess>();
const installPromises = new Map<string, Promise<boolean>>();

// Timed stage timers for early stages (auto-advance designing → scaffolding → coding)
const stageTimers = new Map<string, ReturnType<typeof setTimeout>[]>();
const currentStages = new Map<string, GenerationStage>();

// Track active generation count for health endpoint
let activeJobs = 0;
export function getActiveJobCount(): number {
  return activeJobs;
}

/** Kill a running generation's CLI process and mark it as failed. */
export async function cancelGeneration(generationId: string): Promise<boolean> {
  const child = processStore.get(generationId);
  if (!child) return false;

  child.kill("SIGTERM");
  // Give it a moment, then force kill if still alive
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 3000);

  cleanupTimers(generationId);

  try {
    await prisma.generatedApp.update({
      where: { id: generationId },
      data: { status: "FAILED", currentStage: "failed", error: "Cancelled by user" },
    });
  } catch {
    // Record may not exist yet due to replication delay
  }

  return true;
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

// Start the timed early-stage progression: designing (8s) → scaffolding (10s) → coding
function startTimedStages(generationId: string) {
  // Clear any existing timers
  const existing = stageTimers.get(generationId);
  if (existing) existing.forEach(clearTimeout);

  // Start at "designing" immediately
  updateProgress(generationId, "designing");

  const timers = [
    setTimeout(() => {
      const cur = currentStages.get(generationId);
      if (cur === "designing" || cur === "pending") {
        updateProgress(generationId, "scaffolding");
      }
    }, 8000),
    setTimeout(() => {
      const cur = currentStages.get(generationId);
      if (cur === "scaffolding") {
        updateProgress(generationId, "coding");
      }
    }, 18000), // 8s designing + 10s scaffolding
  ];
  stageTimers.set(generationId, timers);
}

function cleanupTimers(generationId: string) {
  const timers = stageTimers.get(generationId);
  if (timers) {
    timers.forEach(clearTimeout);
    stageTimers.delete(generationId);
  }
  currentStages.delete(generationId);
}

// Write progress to Turso DB instead of in-memory store
async function updateProgress(
  generationId: string,
  stage: GenerationStage,
  extra?: { title?: string; description?: string; error?: string }
) {
  currentStages.set(generationId, stage);

  try {
    const data: Record<string, string | null | undefined> = {
      currentStage: stage,
    };
    // Clear stale detail text when leaving coding phase
    if (stage !== "coding") {
      data.currentDetail = null;
    }
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
    cleanupTimers(generationId);
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
      try {
        const appMeta = extractAppMetadata(workspaceDir);
        console.log(
          `[Generator ${generationId}] Complete: title="${appMeta.title}", description="${appMeta.description?.slice(0, 100)}"`
        );

        await updateProgress(generationId, "finalizing");
        await prepareForPreview(generationId, workspaceDir);

        // Deploy happens inside onComplete — don't mark complete until after
        await onComplete(appMeta);
      } catch (err) {
        // Safety net: if anything throws, still mark as complete so DB doesn't get stuck
        console.error(
          `[Generator ${generationId}] Error in post-generation pipeline:`,
          err instanceof Error ? err.message : err
        );
        try {
          const appMeta = extractAppMetadata(workspaceDir);
          await onComplete(appMeta);
        } catch {
          // Last resort: mark complete with minimal data
          await prisma.generatedApp.update({
            where: { id: generationId },
            data: { status: "COMPLETE", currentStage: "complete" },
          });
        }
      }
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
      try {
        await updateProgress(generationId, "failed", { error: errorMsg });
        await onError(errorMsg);
      } catch (err) {
        console.error(
          `[Generator ${generationId}] Failed to update error state:`,
          err instanceof Error ? err.message : err
        );
        try {
          await prisma.generatedApp.update({
            where: { id: generationId },
            data: { status: "FAILED", currentStage: "failed", error: errorMsg.slice(0, 1000) },
          });
        } catch { /* truly nothing we can do */ }
      }
    }
  });

  child.on("error", async (err) => {
    processStore.delete(generationId);
    cleanupTimers(generationId);
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
  const sections: string[] = [];

  // Business context block (if available)
  if (context) {
    const parts: string[] = [];
    if (context.businessContext) parts.push(`Business: ${context.businessContext}`);
    if (context.companyName) parts.push(`Company name: ${context.companyName}`);
    if (context.state && context.country)
      parts.push(`Location: ${context.state}, ${context.country}`);
    else if (context.country) parts.push(`Location: ${context.country}`);
    if (context.useCases?.length)
      parts.push(`Industry focus: ${context.useCases.join(", ")}`);

    if (parts.length > 0) {
      sections.push(
        ["[BUSINESS CONTEXT]", ...parts, "[END BUSINESS CONTEXT]"].join("\n")
      );
    }
  }

  // User's prompt
  sections.push(rawPrompt);

  // Smart defaults — fill in common requirements users forget to mention
  sections.push(
    [
      "[BUILD REQUIREMENTS]",
      "In addition to the user's request, ensure the app includes:",
      "- A dashboard home page with summary statistics and quick navigation",
      "- Full CRUD (create, read/list, update, delete) for every data entity",
      "- Searchable list views for each entity",
      "- Form validation on required fields",
      "- Delete confirmation dialogs before destructive actions",
      "- Realistic seed data (5-8 records per entity) in prisma/seed.ts",
      "- Responsive navigation that works on mobile (choose the layout style that best fits the app)",
      "- Empty states with helpful messages when sections have no data",
      "[END BUILD REQUIREMENTS]",
    ].join("\n")
  );

  return sections.join("\n\n");
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
  context?: BusinessContext,
  userId?: string,
  orgSlug?: string
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

  // Parallel npm install (--ignore-scripts to avoid prisma generate failing on incomplete schema)
  const installPromise = new Promise<boolean>((resolve) => {
    console.log(`[Generator ${generationId}] Starting parallel npm install...`);
    const installChild = spawn("npm", ["install", "--ignore-scripts"], {
      cwd: workspaceDir,
      stdio: "ignore",
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

  // Parallel Fly.io infrastructure pre-creation (if user has an org)
  let flyInfraPromise: Promise<string> | null = null;
  if (orgSlug) {
    flyInfraPromise = preCreateFlyInfra(generationId, orgSlug).catch((err) => {
      console.error(
        `[Generator ${generationId}] Fly infra pre-creation failed (non-fatal):`,
        err instanceof Error ? err.message : err
      );
      return ""; // Will retry during deploy
    });
  }

  // Update DB: status GENERATING + sourceDir on builder volume
  // Uses retry because of Turso replication delay — the record was just created by Vercel
  await retryUpdate(generationId, { status: "GENERATING", sourceDir: workspaceDir });

  // Start timed early-stage progression (designing 8s → scaffolding 10s → coding)
  startTimedStages(generationId);

  const enrichedPrompt = buildEnrichedPrompt(prompt, context);

  runClaudeCLI(
    generationId,
    workspaceDir,
    buildCLIArgs(enrichedPrompt, false),
    async (appMeta) => {
      // Auto-deploy preview to Fly.io if org exists
      let previewFlyAppId: string | undefined;
      let previewFlyUrl: string | undefined;

      if (orgSlug && flyInfraPromise) {
        try {
          await updateProgress(generationId, "deploying");

          // Wait for pre-created infra, or retry creation
          let flyAppName = await flyInfraPromise;
          if (!flyAppName) {
            console.log(`[Generator ${generationId}] Retrying Fly infra creation...`);
            flyAppName = await preCreateFlyInfra(generationId, orgSlug);
          }

          previewFlyUrl = await deployPreviewApp(generationId, flyAppName, workspaceDir);
          previewFlyAppId = flyAppName;

          console.log(`[Generator ${generationId}] Preview deployed: ${previewFlyUrl}`);

          // Capture screenshot of the running preview (non-blocking)
          try {
            console.log(`[Generator ${generationId}] Capturing screenshot...`);
            const screenshot = await captureScreenshot(previewFlyUrl);
            await prisma.generatedApp.update({
              where: { id: generationId },
              data: { screenshot },
            });
            console.log(`[Generator ${generationId}] Screenshot captured`);
          } catch (screenshotErr) {
            console.error(
              `[Generator ${generationId}] Screenshot failed (non-fatal):`,
              screenshotErr instanceof Error ? screenshotErr.message : screenshotErr
            );
          }
        } catch (err) {
          console.error(
            `[Generator ${generationId}] Preview deploy failed (non-fatal):`,
            err instanceof Error ? err.message : err
          );
        }
      }

      // Auto-create App + OrgApp records if preview deployed
      if (previewFlyAppId && previewFlyUrl && userId && orgSlug) {
        try {
          const org = await prisma.organization.findUnique({
            where: { slug: orgSlug },
          });
          if (org) {
            const app = await prisma.app.create({
              data: {
                title: appMeta.title,
                description: appMeta.description,
                category: "Other",
                icon: "🚀",
                author: userId,
                tags: "",
                isPublic: false,
              },
            });

            await prisma.generatedApp.update({
              where: { id: generationId },
              data: { appId: app.id },
            });

            await prisma.orgApp.create({
              data: {
                organizationId: org.id,
                appId: app.id,
                status: "PREVIEW",
                flyAppId: previewFlyAppId,
                flyUrl: previewFlyUrl,
                deployedAt: new Date(),
              },
            });

            console.log(
              `[Generator ${generationId}] Auto-created App + OrgApp (PREVIEW)`
            );
          }
        } catch (err) {
          console.error(
            `[Generator ${generationId}] Failed to create App/OrgApp records:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      // Mark complete only AFTER deploy finishes (SSE reads this)
      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "COMPLETE",
          currentStage: "complete",
          title: appMeta.title,
          description: appMeta.description,
          previewFlyAppId: previewFlyAppId || undefined,
          previewFlyUrl: previewFlyUrl || undefined,
          previewExpiresAt: previewFlyAppId
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : undefined,
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
    select: { sourceDir: true, previewFlyAppId: true },
  });

  if (!generatedApp?.sourceDir) {
    activeJobs--;
    throw new Error(`No sourceDir found for generation ${generationId}`);
  }

  const workspaceDir = generatedApp.sourceDir;
  const existingFlyAppName = generatedApp.previewFlyAppId;

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
      // Re-deploy to existing Fly app if one exists
      let previewFlyUrl: string | undefined;
      if (existingFlyAppName) {
        try {
          await updateProgress(generationId, "deploying");
          previewFlyUrl = await deployPreviewApp(
            generationId,
            existingFlyAppName,
            workspaceDir
          );
          console.log(
            `[Generator ${generationId}] Iteration re-deployed: ${previewFlyUrl}`
          );
        } catch (err) {
          console.error(
            `[Generator ${generationId}] Iteration re-deploy failed (non-fatal):`,
            err instanceof Error ? err.message : err
          );
        }
      }

      await prisma.appIteration.update({
        where: { id: iterationId },
        data: { status: "COMPLETE" },
      });
      await prisma.generatedApp.update({
        where: { id: generationId },
        data: {
          status: "COMPLETE",
          currentStage: "complete",
          title: appMeta.title,
          description: appMeta.description,
          previewFlyUrl: previewFlyUrl || undefined,
          previewExpiresAt: existingFlyAppName
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : undefined,
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

// Ordered stage list for forward-only progression
const STAGE_ORDER: GenerationStage[] = [
  "pending", "designing", "scaffolding", "coding", "database", "finalizing", "deploying", "complete",
];

function checkForStageMarkers(generationId: string, text: string) {
  const markerPattern = /\[GO4IT:STAGE:(\w+)\]/g;
  let match;
  while ((match = markerPattern.exec(text)) !== null) {
    const stage = match[1] as GenerationStage;
    if (!(stage in STAGE_MESSAGES)) continue;

    // Only allow forward stage transitions — ignore markers that would go backward
    const current = currentStages.get(generationId) || "pending";
    const currentIdx = STAGE_ORDER.indexOf(current);
    const newIdx = STAGE_ORDER.indexOf(stage);
    if (newIdx > currentIdx) {
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

// Try to build the app — returns null on success, error string on failure
function tryBuild(
  generationId: string,
  workspaceDir: string,
  cleanBuild: boolean = false
): string | null {
  if (cleanBuild) {
    // Remove entire .next directory — avoids EACCES errors when files inside
    // .next/build/ are owned by a different user (e.g. root from Claude Code
    // CLI running `next dev` during generation)
    const nextDir = path.join(workspaceDir, ".next");
    if (existsSync(nextDir)) {
      try { rmSync(nextDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }

  try {
    console.log(`[Generator ${generationId}] Running build validation...`);
    execSync("npm run build", {
      cwd: workspaceDir,
      stdio: "pipe",
      timeout: 300000, // 5 minutes — cold builds on shared-cpu-4x can take 2-3 min
      env: { ...process.env, DATABASE_URL: "file:./dev.db" },
    });
    console.log(`[Generator ${generationId}] Build passed`);
    return null;
  } catch (err) {
    const error = err as { stderr?: Buffer; stdout?: Buffer };
    const stderr = error.stderr?.toString() || "";
    const stdout = error.stdout?.toString() || "";
    // Extract the most useful error info (TypeScript errors, etc.)
    const output = stderr || stdout;
    // Filter out non-error lines (deprecation warnings, info messages)
    const errorLines = output
      .split("\n")
      .filter((l) => {
        // Skip known warnings that aren't actual errors
        if (l.includes("middleware") && l.includes("deprecated")) return false;
        if (l.includes("proxy") && l.includes("instead")) return false;
        if (l.includes("⚠") && !l.includes("Error")) return false;
        return l.includes("Error") || l.includes("error") || l.includes("Type error") || l.includes("Module not found") || l.includes("⨯");
      })
      .slice(0, 10)
      .join("\n");

    // If no real error lines found, the "failure" was just warnings — treat as pass
    // BUT verify that standalone output was actually produced
    if (!errorLines.trim()) {
      const standaloneExists = existsSync(path.join(workspaceDir, ".next", "standalone"));
      if (standaloneExists) {
        console.log(`[Generator ${generationId}] Build exited non-zero but only had warnings — treating as pass`);
        return null;
      }
      // Standalone not produced — build actually failed, return full output for auto-fix
      console.log(`[Generator ${generationId}] Build exited non-zero, no error lines found, but .next/standalone missing — treating as failure`);
      const fallbackError = output.split("\n").slice(-20).join("\n");
      return fallbackError || "Build failed: .next/standalone not produced (no error details captured)";
    }

    const buildError = errorLines;
    console.error(`[Generator ${generationId}] Build failed:\n${buildError}`);
    return buildError;
  }
}

// Auto-fix: spawn Claude Code CLI with --continue to fix a build error
function autoFix(
  generationId: string,
  workspaceDir: string,
  buildError: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const fixPrompt = `The app failed to build with this error:\n\n${buildError}\n\nFix the build error. Do not change any pre-built infrastructure files (src/auth.ts, src/auth.config.ts, src/lib/prisma.ts, src/middleware.ts, src/components/SessionProvider.tsx, src/app/globals.css, src/app/auth/page.tsx, src/types/next-auth.d.ts, or any file under src/app/api/auth/). Only fix the files you created or modified.`;

    console.log(`[Generator ${generationId}] Auto-fix: spawning CLI with --continue`);

    const child = spawn("npx", buildCLIArgs(fixPrompt, true), {
      cwd: workspaceDir,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", () => {}); // drain
    child.stderr.on("data", () => {}); // drain

    child.on("close", (code) => {
      console.log(`[Generator ${generationId}] Auto-fix CLI exited with code ${code}`);
      resolve(code === 0);
    });

    child.on("error", (err) => {
      console.error(`[Generator ${generationId}] Auto-fix spawn error:`, err.message);
      resolve(false);
    });
  });
}

const MAX_AUTO_FIX_ATTEMPTS = 2;

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
        execSync("npm install --ignore-scripts", {
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
        execSync("npm install --ignore-scripts", {
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
      execSync("npm install --ignore-scripts", {
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

  // Ensure Prisma schema has binaryTargets for cross-platform preview deploys
  // (Claude may rewrite the generator block, dropping the template's binaryTargets)
  const schemaPath = path.join(workspaceDir, "prisma", "schema.prisma");
  if (existsSync(schemaPath)) {
    let schema = readFileSync(schemaPath, "utf-8");
    if (!schema.includes("binaryTargets")) {
      schema = schema.replace(
        /provider\s*=\s*"prisma-client-js"/,
        'provider      = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]'
      );
      writeFileSync(schemaPath, schema);
      console.log(`[Generator ${generationId}] Injected binaryTargets into schema`);
    }
  }

  // Run prisma format to auto-fix schema relation errors, then generate
  try {
    execSync("npx prisma format", {
      cwd: workspaceDir,
      stdio: "pipe",
      timeout: 15000,
      env,
    });
  } catch {
    console.log(`[Generator ${generationId}] prisma format failed (non-fatal)`);
  }

  try {
    execSync("npx prisma generate", {
      cwd: workspaceDir,
      stdio: "pipe",
      timeout: 30000,
      env,
    });
  } catch {
    console.log(`[Generator ${generationId}] prisma generate failed (non-fatal)`);
  }

  // Delete stale dev.db before db push + seed to prevent duplicate records across iterations
  const devDbPath = path.join(workspaceDir, "dev.db");
  try {
    unlinkSync(devDbPath);
  } catch {
    // File may not exist on first generation — that's fine
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

  // Fix middleware export if Claude used the broken `export default auth(...)` pattern.
  // Next.js 16 needs either a named `middleware` export or a proper default function.
  // The auth() wrapper in preview mode returns a Promise (not a function), breaking middleware.
  const middlewarePath = path.join(workspaceDir, "src", "middleware.ts");
  if (existsSync(middlewarePath)) {
    const mw = readFileSync(middlewarePath, "utf-8");
    if (mw.includes("export default auth(") || !mw.includes("export function middleware") && !mw.includes("export async function middleware")) {
      writeFileSync(middlewarePath, `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (process.env.PREVIEW_MODE === "true") return NextResponse.next();

  const path = req.nextUrl.pathname;

  // Skip auth pages and API routes (APIs self-protect via session checks)
  if (path.startsWith("/auth") || path.startsWith("/api")) {
    return NextResponse.next();
  }

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
`);
      console.log(`[Generator ${generationId}] Fixed middleware export pattern`);
    }
  }

  // Build validation + auto-fix loop
  // First build is a clean build (removes .next from CLI), retries keep cache
  let buildError = tryBuild(generationId, workspaceDir, true);
  for (let attempt = 1; attempt <= MAX_AUTO_FIX_ATTEMPTS && buildError; attempt++) {
    console.log(
      `[Generator ${generationId}] Auto-fix attempt ${attempt}/${MAX_AUTO_FIX_ATTEMPTS}`
    );
    await updateProgress(generationId, "coding");

    const fixed = await autoFix(generationId, workspaceDir, buildError);
    if (!fixed) {
      console.error(`[Generator ${generationId}] Auto-fix CLI failed, giving up`);
      break;
    }

    // Re-run npm install in case the fix added/changed dependencies
    try {
      execSync("npm install --ignore-scripts", {
        cwd: workspaceDir,
        stdio: "pipe",
        timeout: 60000,
      });
    } catch {
      // non-fatal
    }

    // Re-run prisma format + generate after fix
    try {
      execSync("npx prisma format", { cwd: workspaceDir, stdio: "pipe", timeout: 15000, env });
      execSync("npx prisma generate", { cwd: workspaceDir, stdio: "pipe", timeout: 30000, env });
    } catch {
      // non-fatal
    }

    await updateProgress(generationId, "finalizing");
    buildError = tryBuild(generationId, workspaceDir);
  }

  if (buildError) {
    console.error(
      `[Generator ${generationId}] Build still failing after auto-fix attempts — proceeding anyway`
    );
  }
}

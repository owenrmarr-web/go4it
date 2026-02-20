import { FastifyInstance } from "fastify";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { downloadAndExtractBlob } from "../lib/blob.js";
import { preCreateFlyInfra, deployPreviewApp } from "../lib/fly.js";
import { captureScreenshot } from "../lib/screenshot.js";
import prisma from "../lib/prisma.js";

/**
 * Deploy a preview machine for an uploaded (or any) app.
 * Called by the platform after admin approval of developer submissions.
 *
 * Pipeline: download blob → npm install → prisma setup → build → Fly deploy → screenshot → update DB
 */
export default async function deployPreviewRoute(app: FastifyInstance) {
  app.post<{
    Body: { generationId: string; type?: "store" | "draft" };
  }>("/deploy-preview", async (request, reply) => {
    const { generationId, type = "store" } = request.body;

    if (!generationId) {
      return reply.status(400).send({ error: "generationId is required" });
    }

    const gen = await prisma.generatedApp.findUnique({
      where: { id: generationId },
      select: {
        uploadBlobUrl: true,
        sourceDir: true,
        appId: true,
        previewFlyAppId: true,
      },
    });

    if (!gen) {
      return reply.status(404).send({ error: "GeneratedApp not found" });
    }

    if (gen.previewFlyAppId) {
      return reply.status(200).send({
        status: "already_deployed",
        generationId,
        message: "Preview already exists",
      });
    }

    if (!gen.uploadBlobUrl && !gen.sourceDir) {
      return reply
        .status(400)
        .send({ error: "No uploadBlobUrl or sourceDir available" });
    }

    // Run async — return 202 immediately
    runPreviewPipeline(generationId, gen.uploadBlobUrl, gen.sourceDir, gen.appId, type).catch(
      (err) => {
        console.error(
          `[DeployPreview ${generationId}] Unhandled error:`,
          err
        );
      }
    );

    return reply.status(202).send({ status: "accepted", generationId });
  });
}

async function runPreviewPipeline(
  generationId: string,
  uploadBlobUrl: string | null,
  existingSourceDir: string | null,
  appId: string | null,
  type: "store" | "draft" = "store"
) {
  const log = (msg: string) =>
    console.log(`[DeployPreview ${generationId}] ${msg}`);

  let sourceDir: string;

  // 1. Resolve source directory
  if (existingSourceDir && existsSync(existingSourceDir)) {
    sourceDir = existingSourceDir;
    log(`Using existing sourceDir: ${sourceDir}`);
  } else if (uploadBlobUrl) {
    log("Downloading from blob...");
    sourceDir = await downloadAndExtractBlob(uploadBlobUrl, generationId);
    log(`Extracted to: ${sourceDir}`);

    // Persist sourceDir for future use
    await prisma.generatedApp.update({
      where: { id: generationId },
      data: { sourceDir },
    });
  } else {
    throw new Error("No source available");
  }

  const env = { ...process.env, DATABASE_URL: "file:./dev.db" };

  // 2. Inject binaryTargets into Prisma schema if missing (BEFORE npm install so postinstall prisma generate picks them up)
  const schemaPath = path.join(sourceDir, "prisma", "schema.prisma");
  if (existsSync(schemaPath)) {
    let schema = readFileSync(schemaPath, "utf-8");
    if (!schema.includes("binaryTargets")) {
      schema = schema.replace(
        /provider\s*=\s*"prisma-client-js"/,
        'provider      = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]'
      );
      writeFileSync(schemaPath, schema);
      log("Injected binaryTargets into schema");
    }
  }

  // 3. npm install (full — postinstall runs prisma generate which downloads engine binaries)
  log("Running npm install...");
  try {
    execSync("npm install", {
      cwd: sourceDir,
      stdio: "pipe",
      timeout: 300000, // 5 min — includes prisma engine download
      env,
    });
  } catch (err) {
    log(`npm install failed: ${(err as Error).message?.slice(0, 200)}`);
    throw err;
  }

  // 4. Prisma setup: format → generate → db push → seed
  const prismaSteps = [
    { cmd: "npx prisma format", timeout: 60000, label: "prisma format" },
    { cmd: "npx prisma generate", timeout: 60000, label: "prisma generate" },
    {
      cmd: "npx prisma db push --accept-data-loss",
      timeout: 60000,
      label: "prisma db push",
    },
  ];

  for (const step of prismaSteps) {
    try {
      execSync(step.cmd, { cwd: sourceDir, stdio: "pipe", timeout: step.timeout, env });
      log(`${step.label} OK`);
    } catch (err: unknown) {
      const stderr = (err as { stderr?: Buffer })?.stderr?.toString()?.slice(0, 500) || "";
      log(`${step.label} failed: ${stderr || (err as Error).message?.slice(0, 300)}`);
    }
  }

  // Seed data
  const seedPath = path.join(sourceDir, "prisma", "seed.ts");
  if (existsSync(seedPath)) {
    try {
      execSync("npx tsx prisma/seed.ts", {
        cwd: sourceDir,
        stdio: "pipe",
        timeout: 30000,
        env,
      });
      log("Seed data applied");
    } catch (err: unknown) {
      const stderr = (err as { stderr?: Buffer })?.stderr?.toString()?.slice(0, 500) || "";
      log(`Seed failed: ${stderr || (err as Error).message?.slice(0, 300)}`);
    }
  }

  // 5. Create Fly infrastructure
  log("Creating Fly infrastructure...");
  const flyAppName = await preCreateFlyInfra(generationId, "preview");

  // 6. Deploy preview app
  log("Deploying preview app...");
  const flyUrl = await deployPreviewApp(generationId, flyAppName, sourceDir);
  log(`Preview live at ${flyUrl}`);

  // 7. Capture screenshot
  let screenshot: string | null = null;
  try {
    log("Capturing screenshot...");
    // Wait a moment for the app to fully start
    await new Promise((r) => setTimeout(r, 5000));
    screenshot = await captureScreenshot(flyUrl);
    log("Screenshot captured");
  } catch (err) {
    log(`Screenshot failed (non-fatal): ${(err as Error).message?.slice(0, 100)}`);
  }

  // 8. Update GeneratedApp
  await prisma.generatedApp.update({
    where: { id: generationId },
    data: {
      previewFlyAppId: flyAppName,
      previewFlyUrl: flyUrl,
      previewExpiresAt: type === "draft"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day TTL for drafts
        : null, // Store previews persist indefinitely
      ...(screenshot ? { screenshot } : {}),
    },
  });

  // 9. Update App record (store previews only — drafts stay private)
  if (appId && type !== "draft") {
    await prisma.app.update({
      where: { id: appId },
      data: {
        previewUrl: flyUrl,
        previewFlyAppId: flyAppName,
        ...(screenshot ? { screenshot } : {}),
      },
    });
    log(`App record ${appId} updated with store preview URL and screenshot`);
  }

  log("Preview pipeline complete!");
}

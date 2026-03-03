import path from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import {
  flyctl,
  runCommand,
  generateFlyToml,
  generateDeployDockerfile,
  generateStartScript,
  generateDockerignore,
  upgradeTemplateInfra,
  preCreateFlyInfra,
} from "../lib/fly.js";
import { captureScreenshot } from "../lib/screenshot.js";
import prisma from "../lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Deploy or redeploy a preview Fly machine from a Go Suite template source.
 *
 * - Redeploy existing: { templateApp, flyAppName }
 * - Create new preview: { templateApp, generationId } — creates Fly app, deploys, updates DB
 */
export default async function redeployPreviewTemplateRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      templateApp: string;
      flyAppName?: string;
      generationId?: string;
    };
  }>("/redeploy-preview-template", async (request, reply) => {
    const { templateApp, flyAppName, generationId } = request.body;

    if (!templateApp) {
      return reply.status(400).send({ error: "templateApp is required" });
    }

    if (!flyAppName && !generationId) {
      return reply.status(400).send({ error: "Either flyAppName or generationId is required" });
    }

    const templateDir = path.resolve(__dirname, "../../apps", templateApp);
    if (!existsSync(templateDir)) {
      return reply.status(404).send({ error: `Template "${templateApp}" not found` });
    }

    if (flyAppName) {
      // Redeploy to existing Fly app
      runRedeployPipeline(templateApp, templateDir, flyAppName).catch((err) => {
        console.error(`[RedeployPreviewTemplate ${flyAppName}] Unhandled error:`, err);
      });
      return reply.status(202).send({ status: "accepted", flyAppName, templateApp });
    } else {
      // Create new preview from template
      runNewPreviewPipeline(templateApp, templateDir, generationId!).catch((err) => {
        console.error(`[NewPreviewTemplate ${generationId}] Unhandled error:`, err);
      });
      return reply.status(202).send({ status: "accepted", generationId, templateApp });
    }
  });
}

async function runRedeployPipeline(
  templateApp: string,
  templateDir: string,
  flyAppName: string,
  options: { seedData?: boolean } = {}
): Promise<void> {
  const log = (msg: string) => console.log(`[RedeployPreviewTemplate ${flyAppName}] ${msg}`);

  // 1. Copy template to temp dir
  const tmpDir = mkdtempSync(path.join(tmpdir(), `go4it-preview-template-${flyAppName.slice(0, 16)}-`));
  cpSync(templateDir, tmpDir, {
    recursive: true,
    filter: (src) => !src.includes("node_modules") && !src.includes(".next"),
  });
  log(`Copied ${templateApp} → ${tmpDir}`);

  // 2. Generate package-lock.json if missing
  const lockPath = path.join(tmpDir, "package-lock.json");
  if (!existsSync(lockPath)) {
    log("Generating package-lock.json...");
    const lockResult = await runCommand("npm", ["install", "--package-lock-only", "--ignore-scripts"], { cwd: tmpDir });
    if (lockResult.code !== 0) {
      throw new Error(`Failed to generate package-lock.json: ${lockResult.stderr}`);
    }
  }

  // 3. Detect Prisma version
  const pkgPath = path.join(tmpDir, "package.json");
  let isPrisma7 = false;
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const prismaVersion = pkg.devDependencies?.prisma || pkg.dependencies?.prisma || pkg.dependencies?.["@prisma/client"] || "";
      isPrisma7 = /^[\^~>=]*7|^latest$/i.test(prismaVersion);
    } catch {
      isPrisma7 = true;
    }
  }
  log(`Detected Prisma ${isPrisma7 ? "7+" : "6 or earlier"}`);

  // 4. Write deploy files
  writeFileSync(path.join(tmpDir, "fly.toml"), generateFlyToml(flyAppName));
  writeFileSync(path.join(tmpDir, "start.sh"), generateStartScript());

  let dockerfile = generateDeployDockerfile(isPrisma7);

  // For new previews: patch start.sh to run seed on first boot (when volume is empty)
  // This avoids Docker BuildKit cache issues with COPY --from=builder for generated files
  const seedPath = path.join(tmpDir, "prisma", "seed.ts");
  if (options.seedData && existsSync(seedPath)) {
    log("Patching start.sh for first-boot seed...");
    const startScript = readFileSync(path.join(tmpDir, "start.sh"), "utf-8");
    const patchedStart = startScript.replace(
      'echo "Starting application..."',
      `# Seed database on first boot (no existing volume data)
if [ ! -f /data/app.db ]; then
  echo "First boot — seeding database..."
  DATABASE_URL="file:/data/app.db" npx prisma db push --accept-data-loss 2>&1 || true
  DATABASE_URL="file:/data/app.db" npx tsx prisma/seed.ts 2>&1 || echo "Warning: seed failed"
  echo "Seed complete."
fi

echo "Starting application..."`
    );
    writeFileSync(path.join(tmpDir, "start.sh"), patchedStart);
  } else if (existsSync(seedPath)) {
    // Remove seed.ts for redeploys — preview already has seed data in its volume
    unlinkSync(seedPath);
  }

  writeFileSync(path.join(tmpDir, "Dockerfile.fly"), dockerfile);
  writeFileSync(path.join(tmpDir, ".dockerignore"), generateDockerignore());

  // Ensure public/ exists
  const publicDir = path.join(tmpDir, "public");
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // 5. Upgrade template infrastructure (idempotent patches)
  upgradeTemplateInfra(tmpDir);

  // 6. Set PREVIEW_MODE secret (--stage to avoid restart before deploy)
  log("Setting preview secrets...");
  await flyctl(["secrets", "set", "PREVIEW_MODE=true", "--app", flyAppName, "--stage"], { cwd: tmpDir });

  // 7. Deploy
  log("Deploying...");
  const deployResult = await flyctl(
    ["deploy", "--app", flyAppName, "--dockerfile", "Dockerfile.fly", "--yes", "--wait-timeout", "300"],
    { cwd: tmpDir }
  );

  if (deployResult.code !== 0) {
    throw new Error(`Deploy failed: ${deployResult.stderr || deployResult.stdout}`);
  }

  log(`Live at https://${flyAppName}.fly.dev`);
}

async function runNewPreviewPipeline(
  templateApp: string,
  templateDir: string,
  generationId: string
): Promise<void> {
  const log = (msg: string) => console.log(`[NewPreviewTemplate ${generationId}] ${msg}`);

  // 1. Create Fly infrastructure
  log("Creating Fly infrastructure...");
  const flyAppName = await preCreateFlyInfra(generationId, "preview");
  log(`Fly app created: ${flyAppName}`);

  // 2. Run the standard redeploy pipeline (copy, build, deploy) — with seed data for new previews
  await runRedeployPipeline(templateApp, templateDir, flyAppName, { seedData: true });

  // 3. Capture screenshot
  const flyUrl = `https://${flyAppName}.fly.dev`;
  let screenshot: string | null = null;
  try {
    log("Capturing screenshot...");
    await new Promise((r) => setTimeout(r, 5000));
    screenshot = await captureScreenshot(flyUrl);
    log("Screenshot captured");
  } catch (err) {
    log(`Screenshot failed (non-fatal): ${(err as Error).message?.slice(0, 100)}`);
  }

  // 4. Update GeneratedApp with preview info
  const gen = await prisma.generatedApp.findUnique({
    where: { id: generationId },
    select: { appId: true },
  });

  await prisma.generatedApp.update({
    where: { id: generationId },
    data: {
      previewFlyAppId: flyAppName,
      previewFlyUrl: flyUrl,
      ...(screenshot ? { screenshot } : {}),
    },
  });

  // 5. Update App record with preview URL and screenshot
  if (gen?.appId) {
    await prisma.app.update({
      where: { id: gen.appId },
      data: {
        previewUrl: flyUrl,
        previewFlyAppId: flyAppName,
        previewRebuilding: false,
        ...(screenshot ? { screenshot } : {}),
      },
    });
    log(`App record ${gen.appId} updated`);
  }

  log("New preview pipeline complete!");
}

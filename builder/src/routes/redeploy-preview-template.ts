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
} from "../lib/fly.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Redeploy a preview Fly machine from a Go Suite template source.
 * This rebuilds the preview app with the latest template code (dark mode fixes, new endpoints, etc.)
 * without any OrgApp involvement.
 */
export default async function redeployPreviewTemplateRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      templateApp: string;
      flyAppName: string;
    };
  }>("/redeploy-preview-template", async (request, reply) => {
    const { templateApp, flyAppName } = request.body;

    if (!templateApp || !flyAppName) {
      return reply.status(400).send({ error: "templateApp and flyAppName are required" });
    }

    const templateDir = path.resolve(__dirname, "../../apps", templateApp);
    if (!existsSync(templateDir)) {
      return reply.status(404).send({ error: `Template "${templateApp}" not found` });
    }

    // Fire and forget
    runRedeployPipeline(templateApp, templateDir, flyAppName).catch((err) => {
      console.error(`[RedeployPreviewTemplate ${flyAppName}] Unhandled error:`, err);
    });

    return reply.status(202).send({ status: "accepted", flyAppName, templateApp });
  });
}

async function runRedeployPipeline(
  templateApp: string,
  templateDir: string,
  flyAppName: string
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
  writeFileSync(path.join(tmpDir, "Dockerfile.fly"), generateDeployDockerfile(isPrisma7));
  writeFileSync(path.join(tmpDir, ".dockerignore"), generateDockerignore());

  // Ensure public/ exists
  const publicDir = path.join(tmpDir, "public");
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Remove seed.ts (not needed at runtime — preview already has seed data in its volume)
  const seedPath = path.join(tmpDir, "prisma", "seed.ts");
  if (existsSync(seedPath)) {
    unlinkSync(seedPath);
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

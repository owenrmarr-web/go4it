import path from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";
import { cpSync, existsSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { deployApp, launchApp } from "../lib/fly.js";
import prisma from "../lib/prisma.js";
import { downloadAndExtractBlob } from "../lib/blob.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function deployRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      orgAppId: string;
      orgSlug: string;
      generationId?: string;
      uploadBlobUrl?: string;
      templateApp?: string;
      teamMembers: { name: string; email: string; assigned?: boolean; passwordHash?: string }[];
      subdomain?: string;
      existingFlyAppId?: string;
      isPreviewLaunch?: boolean;
    };
  }>("/deploy", async (request, reply) => {
    const {
      orgAppId,
      orgSlug,
      generationId,
      uploadBlobUrl,
      templateApp,
      teamMembers,
      subdomain,
      existingFlyAppId,
      isPreviewLaunch,
    } = request.body;

    console.log(`[Deploy Route] Received: orgAppId=${orgAppId}, isPreviewLaunch=${isPreviewLaunch}, existingFlyAppId=${existingFlyAppId}, templateApp=${templateApp || "none"}`);

    if (!orgAppId || !orgSlug) {
      return reply
        .status(400)
        .send({ error: "orgAppId and orgSlug are required" });
    }

    if (!generationId && !uploadBlobUrl && !templateApp) {
      return reply
        .status(400)
        .send({ error: "Either generationId, uploadBlobUrl, or templateApp is required" });
    }

    // Fast path: promote existing preview app to production via secret flip
    if (isPreviewLaunch && existingFlyAppId) {
      launchApp(
        orgAppId,
        existingFlyAppId,
        teamMembers || [],
        subdomain
      ).catch((err) => {
        console.error(`[Launch] Unhandled error for ${orgAppId}:`, err);
      });

      return reply.status(202).send({ status: "accepted", orgAppId });
    }

    // Full deploy path: resolve source directory
    let sourceDir: string | undefined;

    // Priority 1: templateApp — deploy from local Go Suite source
    if (templateApp) {
      const templateDir = path.resolve(__dirname, "../../apps", templateApp);
      if (existsSync(templateDir)) {
        // Copy to a temp directory so upgradeTemplateInfra can modify without affecting the template
        const tmpDir = mkdtempSync(path.join(tmpdir(), `go4it-template-${orgAppId.slice(0, 8)}-`));
        cpSync(templateDir, tmpDir, { recursive: true, filter: (src) => !src.includes("node_modules") && !src.includes(".next") });
        sourceDir = tmpDir;
        console.log(`[Deploy ${orgAppId}] Using template source: ${templateApp} → ${tmpDir}`);
      } else {
        console.log(`[Deploy ${orgAppId}] Template ${templateApp} not found at ${templateDir}`);
      }
    }

    // Priority 2: generationId — look up stored source
    if (!sourceDir && generationId) {
      const gen = await prisma.generatedApp.findUnique({
        where: { id: generationId },
        select: { sourceDir: true, uploadBlobUrl: true },
      });

      // Verify sourceDir actually exists on disk (cleanup may have deleted it)
      const dbSourceDir = gen?.sourceDir ?? undefined;
      if (dbSourceDir && existsSync(dbSourceDir)) {
        sourceDir = dbSourceDir;
      } else {
        if (dbSourceDir) {
          console.log(`[Deploy ${orgAppId}] sourceDir ${dbSourceDir} no longer exists on disk`);
        }
        // Fallback to blob download
        const blobUrl = gen?.uploadBlobUrl || uploadBlobUrl;
        if (blobUrl) {
          console.log(`[Deploy ${orgAppId}] Downloading from blob...`);
          sourceDir = await downloadAndExtractBlob(blobUrl, orgAppId);
        }
      }
    }

    // Priority 3: uploadBlobUrl — direct blob deploy
    if (!sourceDir && uploadBlobUrl) {
      console.log(`[Deploy ${orgAppId}] Direct blob deploy...`);
      sourceDir = await downloadAndExtractBlob(uploadBlobUrl, orgAppId);
    }

    if (!sourceDir) {
      return reply
        .status(404)
        .send({ error: "No source directory found for this generation" });
    }

    deployApp(
      orgAppId,
      orgSlug,
      sourceDir,
      teamMembers || [],
      subdomain,
      existingFlyAppId
    ).catch((err) => {
      console.error(`[Deploy] Unhandled error for ${orgAppId}:`, err);
    });

    return reply.status(202).send({ status: "accepted", orgAppId });
  });
}

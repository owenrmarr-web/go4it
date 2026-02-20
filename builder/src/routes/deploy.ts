import { FastifyInstance } from "fastify";
import { existsSync } from "fs";
import { deployApp, launchApp } from "../lib/fly.js";
import prisma from "../lib/prisma.js";
import { downloadAndExtractBlob } from "../lib/blob.js";

export default async function deployRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      orgAppId: string;
      orgSlug: string;
      generationId?: string;
      uploadBlobUrl?: string;
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
      teamMembers,
      subdomain,
      existingFlyAppId,
      isPreviewLaunch,
    } = request.body;

    console.log(`[Deploy Route] Received: orgAppId=${orgAppId}, isPreviewLaunch=${isPreviewLaunch}, existingFlyAppId=${existingFlyAppId}`);

    if (!orgAppId || !orgSlug) {
      return reply
        .status(400)
        .send({ error: "orgAppId and orgSlug are required" });
    }

    if (!generationId && !uploadBlobUrl) {
      return reply
        .status(400)
        .send({ error: "Either generationId or uploadBlobUrl is required" });
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

    if (generationId) {
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
    } else if (uploadBlobUrl) {
      // No generationId at all — direct blob deploy
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

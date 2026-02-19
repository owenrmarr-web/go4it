import { FastifyInstance } from "fastify";
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
      teamMembers: { name: string; email: string; passwordHash?: string }[];
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
      sourceDir = gen?.sourceDir ?? undefined;

      // Fallback: if no sourceDir, check for blob on the record itself
      if (!sourceDir && (gen?.uploadBlobUrl || uploadBlobUrl)) {
        const blobUrl = gen?.uploadBlobUrl || uploadBlobUrl;
        console.log(`[Deploy ${orgAppId}] No sourceDir, downloading from blob...`);
        sourceDir = await downloadAndExtractBlob(blobUrl!, orgAppId);
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

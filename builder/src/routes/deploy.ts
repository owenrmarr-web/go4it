import { FastifyInstance } from "fastify";
import { deployApp } from "../lib/fly.js";
import prisma from "../lib/prisma.js";

export default async function deployRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      orgAppId: string;
      orgSlug: string;
      generationId: string;
      teamMembers: { name: string; email: string; passwordHash?: string }[];
      subdomain?: string;
      existingFlyAppId?: string;
    };
  }>("/deploy", async (request, reply) => {
    const {
      orgAppId,
      orgSlug,
      generationId,
      teamMembers,
      subdomain,
      existingFlyAppId,
    } = request.body;

    if (!orgAppId || !orgSlug || !generationId) {
      return reply
        .status(400)
        .send({ error: "orgAppId, orgSlug, and generationId are required" });
    }

    // Look up source directory from the generation record
    const gen = await prisma.generatedApp.findUnique({
      where: { id: generationId },
      select: { sourceDir: true },
    });

    if (!gen?.sourceDir) {
      return reply
        .status(404)
        .send({ error: "No source directory found for this generation" });
    }

    // Start deploy in background
    deployApp(
      orgAppId,
      orgSlug,
      gen.sourceDir,
      teamMembers || [],
      subdomain,
      existingFlyAppId
    ).catch((err) => {
      console.error(`[Deploy] Unhandled error for ${orgAppId}:`, err);
    });

    return reply.status(202).send({ status: "accepted", orgAppId });
  });
}

import { FastifyInstance } from "fastify";
import { startGeneration, type BusinessContext } from "../lib/generator.js";

export default async function generateRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      generationId: string;
      prompt: string;
      businessContext?: BusinessContext;
      userId?: string;
      orgSlug?: string;
    };
  }>("/generate", async (request, reply) => {
    const { generationId, prompt, businessContext, userId, orgSlug } =
      request.body;

    if (!generationId || !prompt) {
      return reply
        .status(400)
        .send({ error: "generationId and prompt are required" });
    }

    // Skip DB verification — the platform already created the record in Turso.
    // Reading it here can fail due to replication delay between Vercel and Fly.io.
    // startGeneration will update the record; if it doesn't exist, that update will fail gracefully.

    // Start generation in background (includes parallel Fly infra + auto-deploy)
    startGeneration(generationId, prompt, businessContext, userId, orgSlug).catch(
      (err) => {
        console.error(`Generation failed for ${generationId}:`, err);
      }
    );

    return reply.status(202).send({ status: "accepted", generationId });
  });
}

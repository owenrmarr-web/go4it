import { FastifyInstance } from "fastify";
import { startGeneration, type BusinessContext } from "../lib/generator.js";
import prisma from "../lib/prisma.js";

export default async function generateRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      generationId: string;
      prompt: string;
      businessContext?: BusinessContext;
    };
  }>("/generate", async (request, reply) => {
    const { generationId, prompt, businessContext } = request.body;

    if (!generationId || !prompt) {
      return reply
        .status(400)
        .send({ error: "generationId and prompt are required" });
    }

    // Verify the generation record exists and is PENDING
    const gen = await prisma.generatedApp.findUnique({
      where: { id: generationId },
      select: { status: true },
    });

    if (!gen) {
      return reply.status(404).send({ error: "Generation not found" });
    }

    if (gen.status !== "PENDING" && gen.status !== "GENERATING") {
      return reply
        .status(409)
        .send({ error: `Generation is already ${gen.status}` });
    }

    // Start generation in background
    startGeneration(generationId, prompt, businessContext).catch((err) => {
      console.error(`Generation failed for ${generationId}:`, err);
    });

    return reply.status(202).send({ status: "accepted", generationId });
  });
}

import { FastifyInstance } from "fastify";
import { startIteration } from "../lib/generator.js";
import prisma from "../lib/prisma.js";

export default async function iterateRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      generationId: string;
      iterationId: string;
      prompt: string;
    };
  }>("/iterate", async (request, reply) => {
    const { generationId, iterationId, prompt } = request.body;

    if (!generationId || !iterationId || !prompt) {
      return reply
        .status(400)
        .send({ error: "generationId, iterationId, and prompt are required" });
    }

    // Verify the generation exists
    const gen = await prisma.generatedApp.findUnique({
      where: { id: generationId },
      select: { sourceDir: true },
    });

    if (!gen?.sourceDir) {
      return reply
        .status(404)
        .send({ error: "Generation not found or no source directory" });
    }

    // Start iteration in background
    startIteration(generationId, iterationId, prompt).catch((err) => {
      console.error(
        `Iteration failed for ${generationId}/${iterationId}:`,
        err
      );
    });

    return reply.status(202).send({ status: "accepted", generationId });
  });
}

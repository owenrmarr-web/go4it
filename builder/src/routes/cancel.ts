import { FastifyInstance } from "fastify";
import { cancelGeneration } from "../lib/generator.js";

export default async function cancelRoute(app: FastifyInstance) {
  app.post<{
    Body: { generationId: string };
  }>("/cancel", async (request, reply) => {
    const { generationId } = request.body;

    if (!generationId) {
      return reply.status(400).send({ error: "generationId is required" });
    }

    const killed = await cancelGeneration(generationId);

    if (killed) {
      console.log(`[Cancel] Killed generation ${generationId}`);
      return reply.send({ status: "cancelled", generationId });
    } else {
      console.log(`[Cancel] No active process for ${generationId}`);
      return reply.send({ status: "not_found", generationId });
    }
  });
}

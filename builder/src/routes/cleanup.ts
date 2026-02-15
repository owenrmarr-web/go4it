import { FastifyInstance } from "fastify";
import { deleteWorkspace } from "../lib/cleanup.js";

export default async function cleanupRoute(app: FastifyInstance) {
  app.delete<{ Params: { id: string } }>(
    "/workspace/:id",
    async (request, reply) => {
      const { id } = request.params;
      if (!id) {
        return reply.status(400).send({ error: "Missing generation ID" });
      }

      const deleted = deleteWorkspace(id);
      return reply.send({ deleted });
    }
  );
}

import { FastifyInstance } from "fastify";
import { getActiveJobCount } from "../lib/generator.js";

export default async function healthRoute(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      activeJobs: getActiveJobCount(),
      uptime: process.uptime(),
    });
  });
}

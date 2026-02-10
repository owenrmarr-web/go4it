import Fastify from "fastify";
import generateRoute from "./routes/generate.js";
import iterateRoute from "./routes/iterate.js";
import deployRoute from "./routes/deploy.js";
import previewRoute from "./routes/preview.js";
import healthRoute from "./routes/health.js";

const BUILDER_API_KEY = process.env.BUILDER_API_KEY;
const PORT = parseInt(process.env.PORT || "3001", 10);

const app = Fastify({
  logger: true,
});

// Auth middleware — require Bearer token on all routes except /health
app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") return;

  const authHeader = request.headers.authorization;
  if (!BUILDER_API_KEY) {
    // No API key configured — allow all requests (dev mode)
    return;
  }

  if (!authHeader || authHeader !== `Bearer ${BUILDER_API_KEY}`) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

// Register routes
app.register(generateRoute);
app.register(iterateRoute);
app.register(deployRoute);
app.register(previewRoute);
app.register(healthRoute);

// Start
async function start() {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`GO4IT Builder Service listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

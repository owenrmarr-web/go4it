import Fastify from "fastify";
import { Readable } from "stream";
import generateRoute from "./routes/generate.js";
import iterateRoute from "./routes/iterate.js";
import deployRoute from "./routes/deploy.js";
import previewRoute, {
  getActivePreview,
  PREVIEW_PORT,
} from "./routes/preview.js";
import healthRoute from "./routes/health.js";
import cleanupRoute from "./routes/cleanup.js";
import secretsRoute from "./routes/secrets.js";
import deployPreviewRoute from "./routes/deploy-preview.js";
import { cleanupExpiredPreviews, cleanupStaleWorkspaces } from "./lib/cleanup.js";

const BUILDER_API_KEY = process.env.BUILDER_API_KEY;
const PORT = parseInt(process.env.PORT || "3001", 10);

const app = Fastify({
  logger: true,
});

// Auth middleware — only require auth for builder API routes, not preview proxy
const PROTECTED_PATHS = new Set(["generate", "iterate", "deploy", "deploy-preview", "preview", "workspace", "secrets"]);

app.addHook("onRequest", async (request, reply) => {
  const firstSegment = request.url.split("?")[0].split("/")[1] || "";

  // Only require auth for builder API routes
  if (firstSegment === "health" || !PROTECTED_PATHS.has(firstSegment)) return;

  const authHeader = request.headers.authorization;
  if (!BUILDER_API_KEY) return; // Dev mode — no auth required

  if (!authHeader || authHeader !== `Bearer ${BUILDER_API_KEY}`) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

// Register builder routes
app.register(generateRoute);
app.register(iterateRoute);
app.register(deployRoute);
app.register(previewRoute);
app.register(healthRoute);
app.register(cleanupRoute);
app.register(secretsRoute);
app.register(deployPreviewRoute);

// Preview proxy — forward unmatched routes to active preview app
// This runs AFTER all registered routes fail to match, so builder API routes
// (/generate, /iterate, /deploy, /preview, /health) are unaffected.
app.setNotFoundHandler(async (request, reply) => {
  const preview = getActivePreview();
  if (!preview || preview.status !== "ready") {
    return reply.code(404).send({ error: "Not found" });
  }

  try {
    const targetUrl = `http://localhost:${PREVIEW_PORT}${request.url}`;

    // Build headers, replacing host
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === "string" && key.toLowerCase() !== "host") {
        headers[key] = value;
      }
    }
    headers["host"] = `localhost:${PREVIEW_PORT}`;

    const fetchOptions: RequestInit = {
      method: request.method as string,
      headers,
      redirect: "manual", // Pass redirects through to client
    };

    // Forward body for non-GET/HEAD requests
    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      request.body
    ) {
      fetchOptions.body =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    reply.code(response.status);
    for (const [key, value] of response.headers.entries()) {
      const lower = key.toLowerCase();
      if (lower !== "transfer-encoding" && lower !== "connection") {
        reply.header(key, value);
      }
    }

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as never);
      return reply.send(nodeStream);
    }
    return reply.send("");
  } catch {
    return reply.code(502).send({ error: "Preview not available" });
  }
});

// Start
async function start() {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`GO4IT Builder Service listening on port ${PORT}`);

    // Run cleanup every hour for expired preview machines and stale workspaces
    setInterval(async () => {
      await cleanupExpiredPreviews();
      await cleanupStaleWorkspaces();
    }, 60 * 60 * 1000);
    console.log("Preview + workspace cleanup scheduled (hourly)");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

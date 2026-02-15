import { FastifyInstance } from "fastify";
import { execSync } from "child_process";

const FLYCTL =
  process.env.FLYCTL_PATH || "/root/.fly/bin/flyctl";

export default async function secretsRoute(app: FastifyInstance) {
  /**
   * POST /secrets/:flyAppId
   * Sets secrets on a Fly.io app and restarts it.
   * Used to flip preview → production (unset PREVIEW_MODE, set AUTH_SECRET + team).
   */
  app.post<{
    Params: { flyAppId: string };
    Body: { secrets: Record<string, string>; unset?: string[] };
  }>("/secrets/:flyAppId", async (request, reply) => {
    const { flyAppId } = request.params;
    const { secrets, unset } = request.body;

    if (!flyAppId) {
      return reply.status(400).send({ error: "Missing flyAppId" });
    }

    if (!secrets || Object.keys(secrets).length === 0) {
      return reply.status(400).send({ error: "No secrets provided" });
    }

    try {
      // Set secrets (triggers machine restart)
      const args = Object.entries(secrets).map(
        ([key, value]) => `${key}=${value}`
      );
      console.log(
        `[Secrets] Setting ${args.length} secret(s) on ${flyAppId}`
      );
      execSync(
        `${FLYCTL} secrets set ${args.map((a) => `'${a}'`).join(" ")} --app ${flyAppId}`,
        { timeout: 60000, stdio: "pipe" }
      );

      // Unset secrets if requested (e.g. PREVIEW_MODE)
      if (unset && unset.length > 0) {
        console.log(
          `[Secrets] Unsetting ${unset.join(", ")} on ${flyAppId}`
        );
        execSync(
          `${FLYCTL} secrets unset ${unset.join(" ")} --app ${flyAppId}`,
          { timeout: 60000, stdio: "pipe" }
        );
      }

      console.log(`[Secrets] Done for ${flyAppId}`);
      return reply.send({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Secrets] Failed for ${flyAppId}:`, msg);
      return reply.status(500).send({ error: `Failed to set secrets: ${msg}` });
    }
  });
}

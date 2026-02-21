import { FastifyInstance } from "fastify";
import { spawn } from "child_process";

const FLYCTL_PATH =
  process.env.FLYCTL_PATH || `${process.env.HOME}/.fly/bin/flyctl`;

function flyctl(args: string[]): Promise<{ stdout: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(FLYCTL_PATH, args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.on("close", (code) => {
      resolve({ stdout, code: code ?? 1 });
    });
    child.on("error", () => {
      resolve({ stdout, code: 1 });
    });
  });
}

export default async function machinesRoute(app: FastifyInstance) {
  // DELETE /machines/:appName - Destroy a Fly app
  app.delete<{ Params: { appName: string } }>("/machines/:appName", async (request, reply) => {
    const { appName } = request.params;

    if (!appName || !appName.startsWith("go4it-")) {
      return reply.status(400).send({ error: "Invalid app name" });
    }

    if (appName === "go4it-builder") {
      return reply.status(403).send({ error: "Cannot destroy the builder" });
    }

    const result = await flyctl(["apps", "destroy", appName, "--yes"]);
    if (result.code !== 0) {
      return reply.status(500).send({ error: `Failed to destroy ${appName}: ${result.stdout}` });
    }

    return reply.send({ success: true, destroyed: appName });
  });

  app.get("/machines", async (_request, reply) => {
    const result = await flyctl(["apps", "list", "--json"]);
    if (result.code !== 0) {
      return reply.status(500).send({ error: "Failed to list Fly apps" });
    }

    let allApps: Array<{
      Name: string;
      Status: string;
      Deployed: boolean;
      Hostname: string;
      CurrentRelease?: {
        Version: number;
        CreatedAt: string;
      };
    }>;

    try {
      allApps = JSON.parse(result.stdout);
    } catch {
      return reply.status(500).send({ error: "Failed to parse flyctl output" });
    }

    const machines = allApps
      .filter((a) => a.Name.startsWith("go4it-"))
      .map((a) => ({
        name: a.Name,
        status: a.Status,
        hostname: a.Hostname,
        currentRelease: a.CurrentRelease
          ? {
              version: a.CurrentRelease.Version,
              createdAt: a.CurrentRelease.CreatedAt,
            }
          : null,
      }));

    return reply.send(machines);
  });
}

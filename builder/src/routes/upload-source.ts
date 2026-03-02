import { FastifyInstance } from "fastify";
import { existsSync } from "fs";
import prisma from "../lib/prisma.js";
import { uploadSourceToBlob } from "../lib/blob.js";

export default async function uploadSourceRoute(app: FastifyInstance) {
  app.post<{
    Body: {
      generationId: string;
    };
  }>("/upload-source", async (request, reply) => {
    const { generationId } = request.body;

    if (!generationId) {
      return reply.status(400).send({ error: "generationId is required" });
    }

    const gen = await prisma.generatedApp.findUnique({
      where: { id: generationId },
      select: { sourceDir: true, uploadBlobUrl: true },
    });

    if (!gen) {
      return reply.status(404).send({ error: "GeneratedApp not found" });
    }

    if (gen.uploadBlobUrl) {
      return reply.status(200).send({
        status: "already_uploaded",
        url: gen.uploadBlobUrl,
      });
    }

    if (!gen.sourceDir || !existsSync(gen.sourceDir)) {
      return reply.status(404).send({
        error: "Source directory not found on disk",
        sourceDir: gen.sourceDir,
      });
    }

    try {
      const blobUrl = await uploadSourceToBlob(gen.sourceDir, generationId);

      await prisma.generatedApp.update({
        where: { id: generationId },
        data: { uploadBlobUrl: blobUrl },
      });

      return reply.status(200).send({ status: "uploaded", url: blobUrl });
    } catch (err) {
      console.error(
        `[UploadSource] Failed to upload ${generationId}:`,
        err instanceof Error ? err.message : err
      );
      return reply.status(500).send({
        error: "Upload failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

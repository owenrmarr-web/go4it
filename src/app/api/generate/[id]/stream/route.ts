import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const STAGE_MESSAGES: Record<string, string> = {
  pending: "Preparing to build your app...",
  designing: "Planning your app architecture...",
  scaffolding: "Creating project structure...",
  coding: "Building components and API routes...",
  database: "Setting up database and seed data...",
  finalizing: "Writing Dockerfile and finishing up...",
  complete: "Your app is ready!",
  failed: "Something went wrong.",
};

// Try to get in-memory progress (works in local dev), fall back gracefully
function getLocalProgress(id: string) {
  try {
    // Dynamic import so this doesn't break on Vercel where generator.ts may not exist
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getProgress } = require("@/lib/generator");
    return getProgress(id);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
  });

  if (!generatedApp) {
    return new Response("Not found", { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastStage = "";
      let lastDetail = "";

      const interval = setInterval(async () => {
        let progress: { stage: string; message: string; detail?: string; title?: string; description?: string; error?: string };

        // Try local in-memory progress first (local dev)
        const localProgress = getLocalProgress(id);
        if (localProgress && localProgress.stage !== "pending") {
          progress = localProgress;
        } else {
          // Fall back to DB — this is the primary path for production (builder service)
          try {
            const dbApp = await prisma.generatedApp.findUnique({
              where: { id },
              select: {
                status: true,
                currentStage: true,
                currentDetail: true,
                title: true,
                description: true,
                error: true,
              },
            });

            if (!dbApp) {
              clearInterval(interval);
              controller.close();
              return;
            }

            if (dbApp.status === "COMPLETE") {
              progress = {
                stage: "complete",
                message: STAGE_MESSAGES.complete,
                title: dbApp.title ?? undefined,
                description: dbApp.description ?? undefined,
              };
            } else if (dbApp.status === "FAILED") {
              progress = {
                stage: "failed",
                message: STAGE_MESSAGES.failed,
                error: dbApp.error ?? undefined,
              };
            } else if (dbApp.status === "GENERATING") {
              // Use currentStage for fine-grained progress from builder
              const stage = dbApp.currentStage || "coding";
              progress = {
                stage,
                message: STAGE_MESSAGES[stage] || "Building your app...",
                detail: dbApp.currentDetail ?? undefined,
              };
            } else {
              progress = {
                stage: "pending",
                message: STAGE_MESSAGES.pending,
              };
            }
          } catch {
            progress = {
              stage: "pending",
              message: STAGE_MESSAGES.pending,
            };
          }
        }

        // Send update when stage or detail changes
        const currentDetail = progress.detail || "";
        if (progress.stage !== lastStage || currentDetail !== lastDetail) {
          lastStage = progress.stage;
          lastDetail = currentDetail;
          const data = JSON.stringify(progress);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // Close stream when generation completes or fails
        if (progress.stage === "complete" || progress.stage === "failed") {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      _request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

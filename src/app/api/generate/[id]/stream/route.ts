import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProgress } from "@/lib/generator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Verify the generation exists and belongs to the user
  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
  });

  if (!generatedApp) {
    return new Response("Not found", { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastStage = "";
      let pendingPolls = 0;

      const interval = setInterval(async () => {
        let progress = getProgress(id);

        // If in-memory store shows pending, check DB immediately
        // (handles HMR wiping in-memory store, spawn failures, etc.)
        if (progress.stage === "pending") {
          pendingPolls++;
          if (pendingPolls >= 1) {
            try {
              const dbApp = await prisma.generatedApp.findUnique({
                where: { id },
                select: { status: true, title: true, description: true, error: true },
              });
              if (dbApp?.status === "GENERATING") {
                progress = {
                  stage: "coding",
                  message: "Building your app (this may take a few minutes)...",
                };
              } else if (dbApp?.status === "COMPLETE") {
                progress = {
                  stage: "complete",
                  message: "Your app is ready!",
                  title: dbApp.title ?? undefined,
                  description: dbApp.description ?? undefined,
                };
              } else if (dbApp?.status === "FAILED") {
                progress = {
                  stage: "failed",
                  message: "Something went wrong.",
                  error: dbApp.error ?? undefined,
                };
              }
            } catch {
              // DB check failed, continue with in-memory
            }
          }
        } else {
          pendingPolls = 0;
        }

        // Send update when stage changes, or periodically during DB fallback
        // to keep the connection alive
        if (progress.stage !== lastStage || pendingPolls > 0) {
          lastStage = progress.stage;
          const data = JSON.stringify(progress);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // Close stream when generation completes or fails
        if (progress.stage === "complete" || progress.stage === "failed") {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // Clean up on cancel
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

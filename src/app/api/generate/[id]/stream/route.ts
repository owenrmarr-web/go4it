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

      const interval = setInterval(() => {
        const progress = getProgress(id);

        // Only send updates when stage changes
        if (progress.stage !== lastStage) {
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

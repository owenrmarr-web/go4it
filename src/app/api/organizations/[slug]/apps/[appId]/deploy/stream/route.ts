import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getDeployProgress, cleanupDeployProgress } from "@/lib/fly";

type RouteContext = { params: Promise<{ slug: string; appId: string }> };

// GET - SSE stream of deploy progress
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { slug, appId } = await context.params;

  // Verify org membership
  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
    },
  });

  if (!organization || !organization.members[0]) {
    return new Response("Forbidden", { status: 403 });
  }

  // Find the OrgApp
  const orgApp = await prisma.orgApp.findUnique({
    where: {
      organizationId_appId: {
        organizationId: organization.id,
        appId,
      },
    },
  });

  if (!orgApp) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const interval = setInterval(() => {
        const progress = getDeployProgress(orgApp.id);
        send(progress);

        // Stop streaming when deploy reaches a terminal state
        if (progress.stage === "running" || progress.stage === "failed") {
          clearInterval(interval);
          // Clean up progress after a short delay
          setTimeout(() => cleanupDeployProgress(orgApp.id), 5000);
          controller.close();
        }
      }, 1500);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
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

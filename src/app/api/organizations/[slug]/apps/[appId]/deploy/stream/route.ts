import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getDeployProgress, cleanupDeployProgress } from "@/lib/fly";
import { syncSubscriptionQuantities } from "@/lib/billing";

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
      let preparingPolls = 0;

      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const interval = setInterval(async () => {
        let progress = getDeployProgress(orgApp.id);

        // DB fallback: if in-memory store stuck on "preparing" (e.g. HMR wiped it),
        // check DB for actual status after a few polls
        if (progress.stage === "preparing") {
          preparingPolls++;
          if (preparingPolls >= 5) {
            try {
              const dbOrgApp = await prisma.orgApp.findUnique({
                where: { id: orgApp.id },
                select: { status: true, flyUrl: true },
              });
              if (dbOrgApp?.status === "RUNNING") {
                progress = {
                  stage: "running",
                  message: "Your app is live!",
                  flyUrl: dbOrgApp.flyUrl ?? undefined,
                };
              } else if (dbOrgApp?.status === "FAILED") {
                progress = {
                  stage: "failed",
                  message: "Something went wrong.",
                  error: "Deploy failed. Check logs for details.",
                };
              }
            } catch { /* DB check failed, continue with in-memory */ }
          }
        } else {
          preparingPolls = 0;
        }

        send(progress);

        // Stop streaming when deploy reaches a terminal state
        if (progress.stage === "running" || progress.stage === "failed") {
          clearInterval(interval);
          // Clean up progress after a short delay
          setTimeout(() => cleanupDeployProgress(orgApp.id), 5000);
          // Sync Stripe subscription quantities on successful deploy
          if (progress.stage === "running") {
            syncSubscriptionQuantities(organization.id).catch((err) => {
              console.error(`[Billing] Failed to sync after deploy:`, err);
            });
          }
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

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { chatEvents, type ChatEvent, trackSSEConnect, trackSSEDisconnect } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Get user's subscribed channels and DMs
  const [channelMemberships, dmConversations] = await Promise.all([
    prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true },
    }),
    prisma.directMessage.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    }),
  ]);

  const channelIds = new Set(channelMemberships.map((c) => c.channelId));
  const dmIds = new Set(dmConversations.map((d) => d.id));

  const encoder = new TextEncoder();
  let keepalive: ReturnType<typeof setInterval>;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (eventType: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const handler = (event: ChatEvent) => {
        // Skip own events (except presence — user needs to see their own status synced across tabs)
        if (event.userId === userId && event.type !== "presence") return;

        // Filter: presence events broadcast to all, others must match subscriptions
        if (event.type !== "presence") {
          if (event.channelId && !channelIds.has(event.channelId)) return;
          if (event.dmId && !dmIds.has(event.dmId)) return;
        }

        send(event.type, event);
      };

      chatEvents.on("event", handler);
      trackSSEConnect(userId);

      // Keepalive every 30s
      keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(":\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        closed = true;
        chatEvents.off("event", handler);
        trackSSEDisconnect(userId);
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      closed = true;
      trackSSEDisconnect(userId);
      clearInterval(keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

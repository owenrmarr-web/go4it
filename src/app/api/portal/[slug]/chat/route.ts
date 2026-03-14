import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  defaultProvider,
  discoverOrgApps,
  executeQuery,
  buildSystemPrompt,
  buildTools,
  checkUsageLimit,
  incrementUsage,
  generateTitle,
  type StreamEvent,
} from "@/lib/ai-assistant";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { slug } = await params;

  // Find org + verify membership
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return new Response(JSON.stringify({ error: "Organization not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: session.user.id,
      },
    },
  });
  if (!membership) {
    return new Response(JSON.stringify({ error: "Not a member" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: { message: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.message || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check usage limit
  const usage = await checkUsageLimit(org.id);
  if (!usage.allowed) {
    return new Response(
      sseFormat({
        type: "usage",
        used: usage.used,
        limit: usage.limit,
        userRole: membership.role,
        limitReached: true,
      }) +
      sseFormat({
        type: "error",
        message: `Daily limit reached (${usage.used}/${usage.limit}).`,
      }) + sseFormat({ type: "done" }),
      {
        headers: sseHeaders(),
      }
    );
  }

  // Create or load conversation
  let conversationId = body.conversationId;
  const isNewConversation = !conversationId;

  if (!conversationId) {
    const conversation = await prisma.conversation.create({
      data: {
        organizationId: org.id,
        userId: session.user.id,
      },
    });
    conversationId = conversation.id;
  } else {
    // Verify conversation belongs to this user + org
    const existing = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: org.id,
        userId: session.user.id,
      },
    });
    if (!existing) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "user",
      content: body.message,
    },
  });

  // Stream the response
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent | { type: string; [key: string]: unknown }) => {
        controller.enqueue(new TextEncoder().encode(sseFormat(event)));
      };

      try {
        // Send conversation ID if new
        if (isNewConversation) {
          send({ type: "conversation", id: conversationId });
        }

        // Send current usage + user role
        send({ type: "usage", used: usage.used + 1, limit: usage.limit, userRole: membership.role });

        // Discover org apps
        const apps = await discoverOrgApps(org.id);

        // Build app lookup for tool execution
        const appByTitle = new Map(apps.map((a) => [a.title, a]));

        // Load conversation history (last 20 messages)
        const history = await prisma.chatMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
          take: 20,
        });

        const messages = history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // Build system prompt and tools
        const system = buildSystemPrompt(org.name, session.user?.name || "Team Member", apps);
        const tools = buildTools(apps);

        // Stream AI response
        const generator = defaultProvider.streamChat({
          system,
          messages,
          tools,
          onToolCall: async (appName: string, query: string) => {
            const app = appByTitle.get(appName);
            if (!app) {
              throw new Error(`Unknown app '${appName}'. Available: ${apps.map((a) => a.title).join(", ")}`);
            }
            return executeQuery(app.flyUrl, query);
          },
        });

        let fullText = "";
        let toolCalls: { app: string; query: string; result?: string; error?: string }[] = [];

        for await (const event of generator) {
          send(event);
          if (event.type === "done" && event.content) {
            fullText = event.content;
          }
        }

        // Extract tool calls from the generator return value
        // The generator yields events and returns { fullText, toolCalls } on completion
        // We already captured fullText from the "done" event

        // Save assistant message
        await prisma.chatMessage.create({
          data: {
            conversationId: conversationId!,
            role: "assistant",
            content: fullText,
            toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
          },
        });

        // Increment usage
        await incrementUsage(org.id);

        // Generate title for new conversations
        if (isNewConversation) {
          try {
            const title = await generateTitle(body.message);
            await prisma.conversation.update({
              where: { id: conversationId! },
              data: { title },
            });
            send({ type: "title", title, conversationId });
          } catch {
            // non-critical
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };
}

function sseFormat(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

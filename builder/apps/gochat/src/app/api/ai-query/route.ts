import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// ============================================================
// AI Query Endpoint — Cross-App Data Access for GoChat
// ============================================================
// This endpoint lets other GO4IT apps (via Claude AI coworker) query
// GoChat data. Supports both user sessions and org-level app-to-app calls.
// ============================================================

const handlers: Record<
  string,
  (userId: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  recent_messages: async (userId) => {
    // Get channels the user has access to (or all for org-level calls)
    const where = userId === "org"
      ? {}
      : { channelId: { in: (await prisma.channelMember.findMany({ where: { userId }, select: { channelId: true } })).map((m) => m.channelId) } };

    const messages = await prisma.message.findMany({
      where: { ...where, parentId: null, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true } },
        channel: { select: { name: true } },
      },
    });

    const items = messages.map((m) => ({
      id: m.id,
      channel: m.channel?.name,
      author: m.user.name,
      content: m.content,
      createdAt: m.createdAt,
    }));

    return {
      type: "recent_messages",
      items,
      summary: `${items.length} recent messages across channels`,
    };
  },

  channel_activity: async (userId) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const channels = userId === "org"
      ? await prisma.channel.findMany({ select: { id: true, name: true } })
      : await prisma.channel.findMany({
          where: { members: { some: { userId } } },
          select: { id: true, name: true },
        });

    const items = [];
    for (const ch of channels) {
      const count = await prisma.message.count({
        where: { channelId: ch.id, createdAt: { gte: sevenDaysAgo } },
      });
      items.push({ channel: ch.name, messageCount: count });
    }

    items.sort((a, b) => b.messageCount - a.messageCount);

    return {
      type: "channel_activity",
      items,
      summary: `Activity across ${items.length} channels (last 7 days)`,
    };
  },

  search_messages: async (userId) => {
    // This handler searches for messages — the query string should contain keywords
    // For now, return recent messages; the AI will refine via the query param
    const messages = await prisma.message.findMany({
      where: { parentId: null, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true } },
        channel: { select: { name: true } },
      },
    });

    const items = messages.map((m) => ({
      id: m.id,
      channel: m.channel?.name,
      author: m.user.name,
      content: m.content,
      createdAt: m.createdAt,
    }));

    return {
      type: "search_results",
      items,
      summary: `${items.length} messages found`,
    };
  },

  user_presence: async () => {
    const presenceData = await prisma.userPresence.findMany({
      include: { user: { select: { name: true, email: true } } },
    });

    const items = presenceData.map((p) => ({
      name: p.user.name,
      email: p.user.email,
      status: p.status,
      lastSeen: p.lastSeen,
      isOOO: p.isOOO,
      oooMessage: p.oooMessage,
    }));

    const online = items.filter((i) => i.status === "online").length;
    const away = items.filter((i) => i.status === "away").length;
    const ooo = items.filter((i) => i.isOOO).length;

    return {
      type: "user_presence",
      items,
      summary: `${online} online, ${away} away, ${ooo} OOO out of ${items.length} users`,
    };
  },
};

const capabilities = Object.keys(handlers);

// Authenticate via user session OR org secret (for app-to-app calls)
async function authenticate(request: Request): Promise<string | null> {
  // Check org secret first (app-to-app calls on Fly.io internal network)
  const secret = request.headers.get("x-go4it-secret");
  const orgSecret = process.env.GO4IT_ORG_SECRET;
  if (secret && orgSecret && secret === orgSecret) {
    return "org";
  }

  // Fall back to user session
  const session = await auth();
  return session?.user?.id || null;
}

// GET /api/ai-query — returns this app's query capabilities
export async function GET() {
  return NextResponse.json({ capabilities });
}

// POST /api/ai-query — execute a query
export async function POST(request: Request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;
  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "Request body must include a 'query' string" },
      { status: 400 }
    );
  }

  // Match query to a handler by keyword
  const q = query.toLowerCase();
  for (const [name, handler] of Object.entries(handlers)) {
    const keywords = name.replace(/_/g, " ");
    if (q.includes(keywords) || q.includes(name)) {
      try {
        const data = await handler(userId);
        return NextResponse.json({
          query,
          status: "success",
          capabilities,
          data,
        });
      } catch (error) {
        console.error(`AI query handler '${name}' error:`, error);
        return NextResponse.json(
          { query, status: "error", error: `Handler '${name}' failed` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    query,
    status: "no_match",
    capabilities,
    message:
      capabilities.length > 0
        ? `No handler matched. Available: ${capabilities.join(", ")}`
        : "No query handlers configured yet.",
  });
}

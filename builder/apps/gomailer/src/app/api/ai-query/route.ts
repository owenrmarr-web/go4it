import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// ============================================================
// AI Query Endpoint — Cross-App Data Access for GO4IT
// ============================================================
// This endpoint lets other GO4IT apps query this app's data.
// The auth scaffolding below handles both user sessions and
// org-level app-to-app calls. DO NOT modify the authenticate
// function — add your query handlers to the `handlers` object.
// ============================================================

// Query handlers — add one for each data model in your app.
// Naming convention: verb_model (e.g., list_contacts, overdue_invoices)
// Each handler receives the authenticated userId (or "org" for app-to-app)
// and must return { type, items, summary }.
const handlers: Record<
  string,
  (userId: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_campaigns: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const campaigns = await prisma.campaign.findMany({
      where,
      select: { name: true, status: true, sentAt: true, recipientCount: true, openCount: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      type: "campaigns",
      items: campaigns,
      summary: `${campaigns.length} campaigns found`,
    };
  },

  campaign_stats: async (userId) => {
    const where = userId === "org" ? { status: "SENT" as const } : { userId, status: "SENT" as const };
    const campaigns = await prisma.campaign.findMany({
      where,
      select: { name: true, recipientCount: true, openCount: true, clickCount: true, bounceCount: true },
    });
    const stats = campaigns.map((c) => ({
      name: c.name,
      openRate: c.recipientCount > 0 ? ((c.openCount / c.recipientCount) * 100).toFixed(1) + "%" : "0%",
      clickRate: c.recipientCount > 0 ? ((c.clickCount / c.recipientCount) * 100).toFixed(1) + "%" : "0%",
      bounceRate: c.recipientCount > 0 ? ((c.bounceCount / c.recipientCount) * 100).toFixed(1) + "%" : "0%",
    }));
    return {
      type: "campaign_stats",
      items: stats,
      summary: `Performance stats for ${stats.length} sent campaigns`,
    };
  },

  list_contact_lists: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const lists = await prisma.contactList.findMany({
      where,
      include: { _count: { select: { subscribers: true } } },
    });
    const items = lists.map((l) => ({
      name: l.name,
      subscriberCount: l._count.subscribers,
      description: l.description,
    }));
    return {
      type: "contact_lists",
      items,
      summary: `${lists.length} contact lists`,
    };
  },

  list_subscribers: async (userId) => {
    const where = userId === "org" ? { status: "ACTIVE" as const } : { userId, status: "ACTIVE" as const };
    const subscribers = await prisma.subscriber.findMany({
      where,
      include: { list: { select: { name: true } } },
      take: 50,
    });
    const items = subscribers.map((s) => ({
      email: s.email,
      name: s.name,
      listName: s.list.name,
    }));
    return {
      type: "subscribers",
      items,
      summary: `${items.length} active subscribers`,
    };
  },

  subscriber_count: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const lists = await prisma.contactList.findMany({
      where,
      include: {
        _count: { select: { subscribers: true } },
        subscribers: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    });
    const items = lists.map((l) => ({
      listName: l.name,
      totalSubscribers: l._count.subscribers,
      activeSubscribers: l.subscribers.length,
    }));
    return {
      type: "subscriber_count",
      items,
      summary: `Subscriber counts across ${lists.length} lists`,
    };
  },

  recent_sends: async (userId) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where = userId === "org"
      ? { sentAt: { gte: sevenDaysAgo } }
      : { userId, sentAt: { gte: sevenDaysAgo } };
    const logs = await prisma.sendLog.findMany({
      where,
      include: { campaign: { select: { name: true } } },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    const items = logs.map((l) => ({
      campaignName: l.campaign.name,
      email: l.subscriberEmail,
      status: l.status,
    }));
    return {
      type: "recent_sends",
      items,
      summary: `${items.length} send logs from the last 7 days`,
    };
  },

  list_templates: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const templates = await prisma.template.findMany({
      where,
      select: { name: true, category: true, subject: true },
    });
    return {
      type: "templates",
      items: templates,
      summary: `${templates.length} email templates`,
    };
  },
};

const capabilities = Object.keys(handlers);

// Authenticate via user session OR org secret (for app-to-app calls).
// DO NOT modify this function.
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

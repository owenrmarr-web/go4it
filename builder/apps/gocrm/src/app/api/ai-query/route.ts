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
  list_contacts: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { company: { select: { name: true } } },
    });
    return {
      type: "contacts",
      items: contacts,
      summary: `${contacts.length} contacts`,
    };
  },

  search_contacts: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastName: "asc" },
      take: 50,
      include: { company: { select: { name: true } } },
    });
    return {
      type: "contacts",
      items: contacts,
      summary: `${contacts.length} contacts found`,
    };
  },

  list_deals: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
    });
    return {
      type: "deals",
      items: deals,
      summary: `${deals.length} deals`,
    };
  },

  open_deals: async (userId) => {
    const where = userId === "org"
      ? { stage: { notIn: ["WON", "LOST"] } }
      : { userId, stage: { notIn: ["WON", "LOST"] } };
    const deals = await prisma.deal.findMany({
      where,
      orderBy: { value: "desc" },
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
    });
    const total = deals.reduce((sum, d) => sum + d.value, 0);
    return {
      type: "open_deals",
      items: deals,
      summary: `${deals.length} open deals worth $${total.toLocaleString()}`,
    };
  },

  list_companies: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { contacts: true } } },
    });
    return {
      type: "companies",
      items: companies,
      summary: `${companies.length} companies`,
    };
  },

  recent_activities: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const activities = await prisma.activity.findMany({
      where,
      orderBy: { date: "desc" },
      take: 20,
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      type: "activities",
      items: activities,
      summary: `${activities.length} recent activities`,
    };
  },

  overdue_tasks: async (userId) => {
    const where = userId === "org"
      ? { completed: false, dueDate: { lt: new Date() } }
      : { userId, completed: false, dueDate: { lt: new Date() } };
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      type: "overdue_tasks",
      items: tasks,
      summary: `${tasks.length} overdue tasks`,
    };
  },

  list_tags: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const tags = await prisma.tag.findMany({
      where,
      include: { _count: { select: { contactTags: true } } },
    });
    return {
      type: "tags",
      items: tags,
      summary: `${tags.length} tags`,
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

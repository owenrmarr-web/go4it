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
  list_tickets: async (userId) => {
    const tickets = await prisma.ticket.findMany({
      where: userId === "org" ? {} : { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return {
      type: "tickets",
      items: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        customerName: t.customerName,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo?.name || null,
        createdAt: t.createdAt,
      })),
      summary: `${tickets.length} recent support tickets`,
    };
  },

  open_tickets: async (userId) => {
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(userId === "org" ? {} : { userId }),
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      orderBy: { createdAt: "asc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return {
      type: "open_tickets",
      items: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        customerName: t.customerName,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo?.name || "Unassigned",
      })),
      summary: `${tickets.length} open or in-progress tickets`,
    };
  },

  unassigned_tickets: async (userId) => {
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(userId === "org" ? {} : { userId }),
        assignedToId: null,
        status: { notIn: ["CLOSED"] },
      },
      orderBy: { createdAt: "asc" },
    });
    return {
      type: "unassigned_tickets",
      items: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        customerName: t.customerName,
        status: t.status,
        priority: t.priority,
      })),
      summary: `${tickets.length} unassigned tickets`,
    };
  },

  ticket_search: async (userId) => {
    const tickets = await prisma.ticket.findMany({
      where: userId === "org" ? {} : { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return {
      type: "ticket_search",
      items: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo?.name || null,
      })),
      summary: `${tickets.length} tickets — use app search for full-text filtering`,
    };
  },

  csat_summary: async (userId) => {
    const rated = await prisma.ticket.findMany({
      where: {
        ...(userId === "org" ? {} : { userId }),
        satisfactionRating: { not: null },
      },
      select: {
        satisfactionRating: true,
        satisfactionComment: true,
        customerName: true,
        resolvedAt: true,
      },
    });
    const avg =
      rated.length > 0
        ? rated.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) /
          rated.length
        : 0;
    return {
      type: "csat_summary",
      items: rated.map((t) => ({
        rating: t.satisfactionRating,
        comment: t.satisfactionComment,
        customer: t.customerName,
        resolvedAt: t.resolvedAt,
      })),
      summary: `${rated.length} CSAT ratings — average score: ${avg.toFixed(1)}/5`,
    };
  },

  list_kb_articles: async (userId) => {
    const articles = await prisma.kBArticle.findMany({
      where: {
        ...(userId === "org" ? {} : { userId }),
        status: "PUBLISHED",
      },
      orderBy: { viewCount: "desc" },
      include: { category: { select: { name: true } } },
    });
    return {
      type: "kb_articles",
      items: articles.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category?.name || "Uncategorized",
        viewCount: a.viewCount,
        helpfulCount: a.helpfulCount,
        slug: a.slug,
      })),
      summary: `${articles.length} published knowledge base articles`,
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

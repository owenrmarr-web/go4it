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
  (
    userId: string,
    params?: Record<string, string>
  ) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_documents: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        clientName: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return {
      type: "documents",
      items: documents,
      summary: `${documents.length} documents found`,
    };
  },

  documents_in_review: async (userId) => {
    const where = userId === "org" ? { status: "IN_REVIEW" } : { userId, status: "IN_REVIEW" };
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        clientName: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
    });
    return {
      type: "documents_in_review",
      items: documents,
      summary: `${documents.length} document${documents.length !== 1 ? "s" : ""} awaiting review`,
    };
  },

  expiring_documents: async (userId) => {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const where =
      userId === "org"
        ? { expiresAt: { gte: now, lte: thirtyDaysOut }, status: { notIn: ["ARCHIVED", "EXPIRED"] } }
        : { userId, expiresAt: { gte: now, lte: thirtyDaysOut }, status: { notIn: ["ARCHIVED", "EXPIRED"] } };
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        clientName: true,
        expiresAt: true,
        status: true,
      },
      orderBy: { expiresAt: "asc" },
    });
    return {
      type: "expiring_documents",
      items: documents,
      summary: `${documents.length} document${documents.length !== 1 ? "s" : ""} expiring within 30 days`,
    };
  },

  document_search: async (userId, params) => {
    const query = params?.query ?? "";
    const q = query.toLowerCase();
    const where =
      userId === "org"
        ? {
            OR: [
              { title: { contains: q } },
              { clientName: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {
            userId,
            OR: [
              { title: { contains: q } },
              { clientName: { contains: q } },
              { description: { contains: q } },
            ],
          };
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        clientName: true,
      },
      take: 10,
    });
    return {
      type: "document_search",
      items: documents,
      summary: `${documents.length} document${documents.length !== 1 ? "s" : ""} matching "${query}"`,
    };
  },

  list_folders: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const folders = await prisma.folder.findMany({
      where,
      include: { _count: { select: { documents: true } } },
      orderBy: { name: "asc" },
    });
    return {
      type: "folders",
      items: folders.map((f) => ({ id: f.id, name: f.name, documentCount: f._count.documents })),
      summary: `${folders.length} folders with ${folders.reduce((sum, f) => sum + f._count.documents, 0)} total documents`,
    };
  },

  list_templates: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const templates = await prisma.documentTemplate.findMany({
      where,
      select: { id: true, name: true, type: true, description: true },
      orderBy: { name: "asc" },
    });
    return {
      type: "templates",
      items: templates,
      summary: `${templates.length} document template${templates.length !== 1 ? "s" : ""} available`,
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

  let body: { query?: string; params?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, params } = body;
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
        const data = await handler(userId, params);
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

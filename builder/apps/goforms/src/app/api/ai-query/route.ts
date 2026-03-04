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
  (userId: string, params?: Record<string, string>) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_forms: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, type: true, status: true, submissionCount: true, createdAt: true },
    });
    return {
      type: "forms",
      items: forms,
      summary: `${forms.length} forms found`,
    };
  },

  active_forms: async (userId) => {
    const where = userId === "org" ? { status: "ACTIVE" } : { userId, status: "ACTIVE" };
    const forms = await prisma.form.findMany({
      where,
      include: { _count: { select: { fields: true } } },
    });
    return {
      type: "active_forms",
      items: forms.map((f) => ({
        id: f.id,
        title: f.title,
        type: f.type,
        fieldCount: f._count.fields,
        submissionCount: f.submissionCount,
      })),
      summary: `${forms.length} active forms`,
    };
  },

  recent_submissions: async (userId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const where = userId === "org"
      ? { createdAt: { gte: sevenDaysAgo } }
      : { userId, createdAt: { gte: sevenDaysAgo } };
    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { form: { select: { title: true } } },
    });
    return {
      type: "recent_submissions",
      items: submissions.map((s) => ({
        id: s.id,
        formTitle: s.form.title,
        respondentName: s.respondentName,
        respondentEmail: s.respondentEmail,
        status: s.status,
        submittedAt: s.createdAt,
      })),
      summary: `${submissions.length} submissions in the last 7 days`,
    };
  },

  form_stats: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const forms = await prisma.form.findMany({
      where,
      select: { id: true, title: true, status: true, submissionCount: true },
    });
    const stats = await Promise.all(
      forms.map(async (f) => {
        const lastSub = await prisma.submission.findFirst({
          where: { formId: f.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        return { ...f, lastSubmission: lastSub?.createdAt ?? null };
      })
    );
    return {
      type: "form_stats",
      items: stats,
      summary: `Stats for ${forms.length} forms`,
    };
  },

  flagged_submissions: async (userId) => {
    const where = userId === "org" ? { status: "FLAGGED" } : { userId, status: "FLAGGED" };
    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { form: { select: { title: true } } },
    });
    return {
      type: "flagged_submissions",
      items: submissions.map((s) => ({
        id: s.id,
        formTitle: s.form.title,
        respondentName: s.respondentName,
        notes: s.notes,
        createdAt: s.createdAt,
      })),
      summary: `${submissions.length} flagged submissions requiring review`,
    };
  },

  submission_search: async (userId, params) => {
    const query = params?.query || "";
    const allSubs = await prisma.submission.findMany({
      where: userId === "org" ? {} : { userId },
      include: { form: { select: { title: true } } },
    });
    const q = query.toLowerCase();
    const matched = allSubs.filter(
      (s) =>
        s.respondentName?.toLowerCase().includes(q) ||
        s.respondentEmail?.toLowerCase().includes(q)
    );
    return {
      type: "submission_search",
      items: matched.map((s) => ({
        id: s.id,
        formTitle: s.form.title,
        respondentName: s.respondentName,
        respondentEmail: s.respondentEmail,
        status: s.status,
        createdAt: s.createdAt,
      })),
      summary: `${matched.length} submissions matching "${query}"`,
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

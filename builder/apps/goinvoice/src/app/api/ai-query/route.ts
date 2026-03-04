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
// Helper: build a where clause that filters by userId unless it's an org-level call.
function userFilter(userId: string) {
  return userId === "org" ? {} : { userId };
}

const handlers: Record<
  string,
  (userId: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_invoices: async (userId) => {
    const invoices = await prisma.invoice.findMany({
      where: { ...userFilter(userId) },
      include: { client: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
      take: 20,
    });
    const items = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      status: inv.status,
      total: inv.total,
      dueDate: inv.dueDate,
    }));
    return {
      type: "invoices",
      items,
      summary: `Found ${items.length} recent invoice${items.length === 1 ? "" : "s"}.`,
    };
  },

  list_estimates: async (userId) => {
    const estimates = await prisma.estimate.findMany({
      where: { ...userFilter(userId) },
      include: { client: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
      take: 20,
    });
    const items = estimates.map((est) => ({
      id: est.id,
      estimateNumber: est.estimateNumber,
      clientName: est.client.name,
      status: est.status,
      total: est.total,
      expiresAt: est.expiresAt,
    }));
    return {
      type: "estimates",
      items,
      summary: `Found ${items.length} recent estimate${items.length === 1 ? "" : "s"}.`,
    };
  },

  overdue_invoices: async (userId) => {
    const now = new Date();
    const overdue = await prisma.invoice.findMany({
      where: {
        ...userFilter(userId),
        status: "OVERDUE",
        dueDate: { lt: now },
      },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    });
    const items = overdue.map((inv) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        total: inv.total,
        amountPaid: inv.amountPaid,
        amountDue: inv.total - inv.amountPaid,
        dueDate: inv.dueDate,
        daysOverdue,
      };
    });
    const totalDue = items.reduce((sum, i) => sum + i.amountDue, 0);
    return {
      type: "overdue_invoices",
      items,
      summary: `${items.length} overdue invoice${items.length === 1 ? "" : "s"} totaling $${totalDue.toLocaleString()}.`,
    };
  },

  outstanding_balance: async (userId) => {
    const unpaid = await prisma.invoice.findMany({
      where: {
        ...userFilter(userId),
        status: { in: ["SENT", "OVERDUE"] },
      },
      include: { client: { select: { name: true } } },
    });
    const items = unpaid.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      total: inv.total,
      amountPaid: inv.amountPaid,
      amountDue: inv.total - inv.amountPaid,
    }));
    const totalOutstanding = items.reduce((sum, i) => sum + i.amountDue, 0);
    return {
      type: "outstanding_balance",
      items,
      summary: `Total outstanding balance is $${totalOutstanding.toLocaleString()} across ${items.length} unpaid invoice${items.length === 1 ? "" : "s"}.`,
    };
  },

  recent_payments: async (userId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const payments = await prisma.payment.findMany({
      where: {
        ...userFilter(userId),
        paymentDate: { gte: thirtyDaysAgo },
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });
    const items = payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice.invoiceNumber,
      clientName: p.invoice.client.name,
      amount: p.amount,
      method: p.method,
      paymentDate: p.paymentDate,
    }));
    const totalReceived = items.reduce((sum, p) => sum + p.amount, 0);
    return {
      type: "recent_payments",
      items,
      summary: `${items.length} payment${items.length === 1 ? "" : "s"} received in the last 30 days totaling $${totalReceived.toLocaleString()}.`,
    };
  },

  monthly_revenue: async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const payments = await prisma.payment.findMany({
      where: {
        ...userFilter(userId),
        paymentDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });
    const items = payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice.invoiceNumber,
      clientName: p.invoice.client.name,
      amount: p.amount,
      method: p.method,
      paymentDate: p.paymentDate,
    }));
    const totalRevenue = items.reduce((sum, p) => sum + p.amount, 0);
    const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });
    return {
      type: "monthly_revenue",
      items,
      summary: `Total revenue for ${monthName} is $${totalRevenue.toLocaleString()} from ${items.length} payment${items.length === 1 ? "" : "s"}.`,
    };
  },

  list_expenses: async (userId) => {
    const expenses = await prisma.expense.findMany({
      where: { ...userFilter(userId) },
      orderBy: { date: "desc" },
      take: 20,
    });
    const items = expenses.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amount: e.amount,
      date: e.date,
      vendor: e.vendor,
      isReimbursable: e.isReimbursable,
      isReimbursed: e.isReimbursed,
    }));
    const totalAmount = items.reduce((sum, e) => sum + e.amount, 0);
    return {
      type: "expenses",
      items,
      summary: `Found ${items.length} recent expense${items.length === 1 ? "" : "s"} totaling $${totalAmount.toLocaleString()}.`,
    };
  },

  list_clients: async (userId) => {
    const clients = await prisma.client.findMany({
      where: { ...userFilter(userId) },
      include: {
        invoices: {
          select: { total: true },
        },
      },
      orderBy: { name: "asc" },
    });
    const items = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalBilled: c.invoices.reduce((sum, inv) => sum + inv.total, 0),
    }));
    return {
      type: "clients",
      items,
      summary: `Found ${items.length} client${items.length === 1 ? "" : "s"}.`,
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

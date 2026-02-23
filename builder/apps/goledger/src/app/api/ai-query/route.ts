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
  list_invoices: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const items = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      client: inv.client.name,
      status: inv.status,
      total: inv.total,
      amountPaid: inv.amountPaid,
      dueDate: inv.dueDate.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));
    return {
      type: "invoices",
      items,
      summary: `${items.length} most recent invoices`,
    };
  },

  overdue_invoices: async (userId) => {
    const now = new Date();
    const where = {
      ...(userId !== "org" && { userId }),
      status: { in: ["SENT", "VIEWED", "PARTIAL"] },
      dueDate: { lt: now },
    };
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    const items = invoices.map((inv) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        client: inv.client.name,
        status: inv.status,
        total: inv.total,
        outstanding: inv.total - inv.amountPaid,
        dueDate: inv.dueDate.toISOString(),
        daysOverdue,
      };
    });
    const totalOutstanding = items.reduce((sum, i) => sum + i.outstanding, 0);
    return {
      type: "overdue_invoices",
      items,
      summary: `${items.length} overdue invoices totaling $${totalOutstanding.toLocaleString()}`,
    };
  },

  recent_payments: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const payments = await prisma.payment.findMany({
      where,
      include: {
        client: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { date: "desc" },
      take: 20,
    });
    const items = payments.map((p) => ({
      id: p.id,
      client: p.client.name,
      invoiceNumber: p.invoice.invoiceNumber,
      amount: p.amount,
      method: p.method,
      date: p.date.toISOString(),
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    return {
      type: "payments",
      items,
      summary: `${items.length} recent payments totaling $${totalAmount.toLocaleString()}`,
    };
  },

  list_expenses: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 20,
    });
    const items = expenses.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category?.name || "Uncategorized",
      vendor: e.vendor,
      amount: e.amount,
      date: e.date.toISOString(),
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    return {
      type: "expenses",
      items,
      summary: `${items.length} recent expenses totaling $${totalAmount.toLocaleString()}`,
    };
  },

  expenses_by_category: async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const where = {
      ...(userId !== "org" && { userId }),
      date: { gte: startOfMonth, lte: endOfMonth },
    };
    const expenses = await prisma.expense.findMany({
      where,
      include: { category: { select: { name: true } } },
    });
    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category?.name || "Uncategorized";
      byCategory.set(cat, (byCategory.get(cat) || 0) + e.amount);
    }
    const items = Array.from(byCategory.entries()).map(([category, total]) => ({
      category,
      total,
    }));
    items.sort((a, b) => b.total - a.total);
    const grandTotal = items.reduce((sum, i) => sum + i.total, 0);
    return {
      type: "expenses_by_category",
      items,
      summary: `${items.length} expense categories this month, total $${grandTotal.toLocaleString()}`,
    };
  },

  list_clients: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const clients = await prisma.client.findMany({
      where,
      include: {
        invoices: {
          where: { status: { in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE"] } },
          select: { total: true, amountPaid: true },
        },
      },
      orderBy: { name: "asc" },
    });
    const items = clients.map((c) => {
      const outstanding = c.invoices.reduce(
        (sum, inv) => sum + (inv.total - inv.amountPaid),
        0
      );
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        role: c.role,
        outstandingBalance: outstanding,
      };
    });
    return {
      type: "clients",
      items,
      summary: `${items.length} clients`,
    };
  },

  cash_flow_summary: async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const invoiceWhere = userId !== "org" ? { userId } : {};

    const [paidInvoices, expenses, outstandingInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...invoiceWhere,
          status: "PAID",
          paidAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.expense.findMany({
        where: {
          ...(userId !== "org" && { userId }),
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.invoice.findMany({
        where: {
          ...invoiceWhere,
          status: { in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE"] },
        },
      }),
    ]);

    const totalIncome = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const outstandingAR = outstandingInvoices.reduce(
      (sum, inv) => sum + (inv.total - inv.amountPaid),
      0
    );

    const items = [
      {
        metric: "Total Income (Paid)",
        value: totalIncome,
      },
      {
        metric: "Total Expenses",
        value: totalExpenses,
      },
      {
        metric: "Net Cash Flow",
        value: totalIncome - totalExpenses,
      },
      {
        metric: "Outstanding AR",
        value: outstandingAR,
      },
    ];

    return {
      type: "cash_flow_summary",
      items,
      summary: `Current month: $${totalIncome.toLocaleString()} income, $${totalExpenses.toLocaleString()} expenses, $${outstandingAR.toLocaleString()} outstanding`,
    };
  },

  revenue_this_month: async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const where = userId !== "org" ? { userId } : {};

    const [invoicedThisMonth, paidThisMonth] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...where,
          issueDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.invoice.findMany({
        where: {
          ...where,
          status: "PAID",
          paidAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    const totalInvoiced = invoicedThisMonth.reduce(
      (sum, inv) => sum + inv.total,
      0
    );
    const totalPaid = paidThisMonth.reduce((sum, inv) => sum + inv.total, 0);

    const items = [
      { metric: "Total Invoiced", value: totalInvoiced },
      { metric: "Total Paid", value: totalPaid },
    ];

    return {
      type: "revenue_this_month",
      items,
      summary: `This month: $${totalInvoiced.toLocaleString()} invoiced, $${totalPaid.toLocaleString()} paid`,
    };
  },

  list_estimates: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const estimates = await prisma.estimate.findMany({
      where,
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const items = estimates.map((est) => ({
      id: est.id,
      estimateNumber: est.estimateNumber,
      client: est.client.name,
      status: est.status,
      total: est.total,
      createdAt: est.createdAt.toISOString(),
    }));
    return {
      type: "estimates",
      items,
      summary: `${items.length} most recent estimates`,
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

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch all needed data in parallel
  const [
    unpaidInvoices,
    draftInvoices,
    paidThisMonth,
    expensesThisMonth,
    recentInvoices,
    recentPayments,
    recentExpenses,
  ] = await Promise.all([
    // Unpaid invoices (SENT, VIEWED, PARTIAL, OVERDUE)
    prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE"] },
      },
    }),
    // Draft invoices
    prisma.invoice.count({
      where: { userId: session.user.id, status: "DRAFT" },
    }),
    // Revenue this month (paid invoices)
    prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        status: "PAID",
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // Expenses this month
    prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // Recent invoices
    prisma.invoice.findMany({
      where: { userId: session.user.id },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Recent payments
    prisma.payment.findMany({
      where: { userId: session.user.id },
      include: {
        client: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    // Recent expenses
    prisma.expense.findMany({
      where: { userId: session.user.id },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  // Calculate totals
  const totalReceivable = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );

  const overdueInvoices = unpaidInvoices.filter(
    (inv) => new Date(inv.dueDate) < now
  );
  const totalOverdue = overdueInvoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );

  const revenueThisMonth = paidThisMonth.reduce(
    (sum, inv) => sum + inv.total,
    0
  );
  const expensesThisMonthTotal = expensesThisMonth.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  // Combine recent activity and sort by date
  const recentActivity = [
    ...recentInvoices.map((inv) => ({
      type: "invoice" as const,
      id: inv.id,
      description: `Invoice ${inv.invoiceNumber} to ${inv.client.name}`,
      amount: inv.total,
      status: inv.status,
      date: inv.createdAt.toISOString(),
    })),
    ...recentPayments.map((p) => ({
      type: "payment" as const,
      id: p.id,
      description: `Payment from ${p.client.name} on ${p.invoice.invoiceNumber}`,
      amount: p.amount,
      status: p.method,
      date: p.date.toISOString(),
    })),
    ...recentExpenses.map((e) => ({
      type: "expense" as const,
      id: e.id,
      description: e.description,
      amount: e.amount,
      status: e.category?.name || "Uncategorized",
      date: e.date.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return NextResponse.json({
    totalReceivable,
    totalOverdue,
    overdueCount: overdueInvoices.length,
    draftCount: draftInvoices,
    revenueThisMonth,
    expensesThisMonth: expensesThisMonthTotal,
    recentActivity,
  });
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ReportsView from "./ReportsView";

function getMonthKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function getLast12Months(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(date);
    months.push({ key, label: getMonthLabel(key) });
  }
  return months;
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const months = getLast12Months();

  // Fetch all needed data in parallel
  const [payments, expenses, invoices, clients] = await Promise.all([
    prisma.payment.findMany({
      where: {
        userId,
        paymentDate: { gte: twelveMonthsAgo },
      },
      select: {
        amount: true,
        paymentDate: true,
      },
    }),

    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: twelveMonthsAgo },
      },
      select: {
        amount: true,
        date: true,
        category: true,
      },
    }),

    prisma.invoice.findMany({
      where: { userId },
      include: {
        client: { select: { name: true } },
      },
    }),

    prisma.client.findMany({
      where: { userId },
      include: {
        invoices: {
          select: {
            total: true,
            amountPaid: true,
            status: true,
          },
        },
      },
    }),
  ]);

  // --- Revenue Summary ---
  const monthlyRevenue: Record<string, number> = {};
  for (const m of months) monthlyRevenue[m.key] = 0;
  for (const p of payments) {
    const key = getMonthKey(new Date(p.paymentDate));
    if (monthlyRevenue[key] !== undefined) {
      monthlyRevenue[key] += p.amount;
    }
  }

  const totalInvoiced = invoices
    .filter((inv) => inv.status !== "CANCELLED" && inv.status !== "DRAFT")
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const revenueData = months.map((m) => ({
    month: m.label,
    amount: monthlyRevenue[m.key],
  }));

  // --- Expense Summary ---
  const monthlyExpenses: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};
  for (const m of months) monthlyExpenses[m.key] = 0;

  for (const e of expenses) {
    const key = getMonthKey(new Date(e.date));
    if (monthlyExpenses[key] !== undefined) {
      monthlyExpenses[key] += e.amount;
    }
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  }

  const expenseData = months.map((m) => ({
    month: m.label,
    amount: monthlyExpenses[m.key],
  }));

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }));

  // --- Profit & Loss ---
  const profitLossData = months.map((m) => ({
    month: m.label,
    revenue: monthlyRevenue[m.key],
    expenses: monthlyExpenses[m.key],
    profit: monthlyRevenue[m.key] - monthlyExpenses[m.key],
  }));

  // --- Outstanding AR (Aging) ---
  const unpaidInvoices = invoices.filter(
    (inv) =>
      inv.status !== "PAID" &&
      inv.status !== "CANCELLED" &&
      inv.status !== "DRAFT"
  );

  const agingBuckets: {
    label: string;
    invoices: {
      id: string;
      invoiceNumber: string;
      clientName: string;
      total: number;
      amountPaid: number;
      balance: number;
      dueDate: string;
      daysOverdue: number;
    }[];
    total: number;
  }[] = [
    { label: "Current (Not Due)", invoices: [], total: 0 },
    { label: "1-30 Days Overdue", invoices: [], total: 0 },
    { label: "31-60 Days Overdue", invoices: [], total: 0 },
    { label: "60+ Days Overdue", invoices: [], total: 0 },
  ];

  for (const inv of unpaidInvoices) {
    const dueDate = new Date(inv.dueDate);
    const diffMs = now.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const balance = inv.total - inv.amountPaid;

    const invoiceData = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      total: inv.total,
      amountPaid: inv.amountPaid,
      balance,
      dueDate: inv.dueDate.toISOString(),
      daysOverdue: Math.max(0, daysOverdue),
    };

    let bucketIndex: number;
    if (daysOverdue <= 0) {
      bucketIndex = 0;
    } else if (daysOverdue <= 30) {
      bucketIndex = 1;
    } else if (daysOverdue <= 60) {
      bucketIndex = 2;
    } else {
      bucketIndex = 3;
    }

    agingBuckets[bucketIndex].invoices.push(invoiceData);
    agingBuckets[bucketIndex].total += balance;
  }

  // --- Client Summary ---
  const clientSummary = clients
    .map((c) => {
      const totalBilled = c.invoices
        .filter((inv) => inv.status !== "CANCELLED" && inv.status !== "DRAFT")
        .reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = c.invoices.reduce(
        (sum, inv) => sum + inv.amountPaid,
        0
      );
      const invoiceCount = c.invoices.filter(
        (inv) => inv.status !== "CANCELLED" && inv.status !== "DRAFT"
      ).length;
      return {
        id: c.id,
        name: c.name,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid,
        invoiceCount,
      };
    })
    .filter((c) => c.invoiceCount > 0)
    .sort((a, b) => b.totalBilled - a.totalBilled);

  return (
    <ReportsView
      revenueData={revenueData}
      totalInvoiced={totalInvoiced}
      totalCollected={totalCollected}
      expenseData={expenseData}
      topCategories={topCategories}
      profitLossData={profitLossData}
      agingBuckets={agingBuckets}
      clientSummary={clientSummary}
    />
  );
}

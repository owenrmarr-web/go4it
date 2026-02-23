import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";
import Sidebar from "@/components/Sidebar";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    unpaidInvoices,
    overdueInvoices,
    draftInvoices,
    monthRevenue,
    monthExpenses,
    recentInvoices,
    recentPayments,
    recentExpenses,
    monthlyData,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId, status: { in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE"] } },
      select: { total: true, amountPaid: true },
    }),
    prisma.invoice.findMany({
      where: { userId, status: "OVERDUE" },
      select: { total: true, amountPaid: true },
    }),
    prisma.invoice.count({ where: { userId, status: "DRAFT" } }),
    prisma.payment.aggregate({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: { client: { select: { name: true } }, invoice: { select: { invoiceNumber: true } } },
    }),
    prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
    }),
    // Get last 6 months of data
    (async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const [rev, exp] = await Promise.all([
          prisma.payment.aggregate({
            where: { userId, date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
          prisma.expense.aggregate({
            where: { userId, date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ]);
        months.push({
          month: start.toLocaleDateString("en-US", { month: "short" }),
          revenue: rev._sum.amount || 0,
          expenses: exp._sum.amount || 0,
        });
      }
      return months;
    })(),
  ]);

  const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
  const revenueThisMonth = monthRevenue._sum.amount || 0;
  const expensesThisMonth = monthExpenses._sum.amount || 0;

  // Build activity feed
  const activities = [
    ...recentInvoices.map((inv) => ({
      type: "invoice" as const,
      description: `Invoice ${inv.invoiceNumber} for ${inv.client.name}`,
      amount: inv.total,
      date: inv.createdAt.toISOString(),
      status: inv.status,
    })),
    ...recentPayments.map((pay) => ({
      type: "payment" as const,
      description: `Payment on ${pay.invoice.invoiceNumber} from ${pay.client.name}`,
      amount: pay.amount,
      date: pay.date.toISOString(),
    })),
    ...recentExpenses.map((exp) => ({
      type: "expense" as const,
      description: exp.description,
      amount: exp.amount,
      date: exp.date.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <DashboardClient
          totalReceivable={totalReceivable}
          overdueCount={overdueInvoices.length}
          overdueTotal={overdueTotal}
          draftCount={draftInvoices}
          revenueThisMonth={revenueThisMonth}
          expensesThisMonth={expensesThisMonth}
          activities={activities}
          chartData={monthlyData}
        />
      </main>
    </div>
  );
}

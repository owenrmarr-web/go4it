import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Badge from "@/components/Badge";
import Link from "next/link";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function statusBadgeVariant(
  status: string
): "success" | "info" | "error" | "warning" | "neutral" {
  switch (status) {
    case "PAID":
      return "success";
    case "SENT":
      return "info";
    case "OVERDUE":
      return "error";
    case "PARTIALLY_PAID":
      return "warning";
    case "DRAFT":
    case "CANCELLED":
    default:
      return "neutral";
  }
}

function daysUntil(date: Date): number {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const sevenDaysFromNow = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  // Fetch all data in parallel
  const [
    outstandingInvoices,
    paymentsThisMonth,
    overdueInvoices,
    expensesThisMonth,
    recentInvoices,
    upcomingInvoices,
  ] = await Promise.all([
    // Total outstanding: unpaid invoices (not PAID, not CANCELLED, not DRAFT)
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
      },
      select: { total: true, amountPaid: true },
    }),

    // Revenue this month: payments received
    prisma.payment.aggregate({
      where: {
        userId,
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),

    // Overdue invoices count
    prisma.invoice.count({
      where: {
        userId,
        status: "OVERDUE",
      },
    }),

    // Expenses this month
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),

    // Recent invoices (last 5)
    prisma.invoice.findMany({
      where: { userId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Upcoming due dates (next 7 days, not paid/cancelled)
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ["SENT", "DRAFT", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { gte: now, lte: sevenDaysFromNow },
      },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );
  const revenueThisMonth = paymentsThisMonth._sum.amount ?? 0;
  const expensesTotal = expensesThisMonth._sum.amount ?? 0;

  const summaryCards = [
    {
      label: "Total Outstanding",
      value: formatCurrency(totalOutstanding),
      subtext: `${outstandingInvoices.length} unpaid invoice${outstandingInvoices.length !== 1 ? "s" : ""}`,
      accent: "text-status-amber-fg",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(revenueThisMonth),
      subtext: new Intl.DateTimeFormat("en-US", { month: "long" }).format(now),
      accent: "text-status-green-fg",
    },
    {
      label: "Overdue Invoices",
      value: overdueInvoices.toString(),
      subtext: overdueInvoices === 0 ? "All caught up" : "Needs attention",
      accent: overdueInvoices > 0 ? "text-status-red-fg" : "text-status-green-fg",
    },
    {
      label: "Expenses This Month",
      value: formatCurrency(expensesTotal),
      subtext: new Intl.DateTimeFormat("en-US", { month: "long" }).format(now),
      accent: "text-fg-secondary",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
        <p className="text-sm text-fg-muted mt-1">
          Overview of your invoicing activity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-card border border-edge rounded-xl shadow-sm p-5"
          >
            <p className="text-sm font-medium text-fg-muted">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.accent}`}>
              {card.value}
            </p>
            <p className="text-xs text-fg-muted mt-1">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices - takes 2 columns */}
        <div className="lg:col-span-2 bg-card border border-edge rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
            <h2 className="text-base font-semibold text-fg">
              Recent Invoices
            </h2>
            <Link
              href="/invoices"
              className="text-sm text-accent-fg hover:underline"
            >
              View all
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-fg-muted">
                No invoices yet. Create your first invoice to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-edge">
              {recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-fg truncate">
                        {invoice.invoiceNumber}
                      </p>
                      <Badge variant={statusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5 truncate">
                      {invoice.client.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-fg">
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Due {formatShortDate(invoice.dueDate)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Due Dates */}
          <div className="bg-card border border-edge rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-edge">
              <h2 className="text-base font-semibold text-fg">
                Upcoming Due Dates
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">Next 7 days</p>
            </div>

            {upcomingInvoices.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-fg-muted">
                  No invoices due in the next 7 days
                </p>
              </div>
            ) : (
              <div className="divide-y divide-edge">
                {upcomingInvoices.map((invoice) => {
                  const days = daysUntil(invoice.dueDate);
                  const urgencyVariant: "error" | "warning" | "info" =
                    days <= 1 ? "error" : days <= 3 ? "warning" : "info";

                  return (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-hover transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg truncate">
                          {invoice.client.name}
                        </p>
                        <p className="text-xs text-fg-muted truncate">
                          {invoice.invoiceNumber}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold text-fg">
                          {formatCurrency(invoice.total)}
                        </p>
                        <Badge variant={urgencyVariant}>
                          {days === 0
                            ? "Today"
                            : days === 1
                              ? "Tomorrow"
                              : `${days} days`}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue vs Expenses */}
          <div className="bg-card border border-edge rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-fg mb-4">
              Revenue vs Expenses
            </h2>
            <p className="text-xs text-fg-muted mb-3">
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(now)}
            </p>

            <div className="space-y-3">
              {/* Revenue bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-fg-secondary">Revenue</span>
                  <span className="text-sm font-semibold text-status-green-fg">
                    {formatCurrency(revenueThisMonth)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-status-green transition-all"
                    style={{
                      width:
                        revenueThisMonth + expensesTotal > 0
                          ? `${(revenueThisMonth / (revenueThisMonth + expensesTotal)) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              {/* Expenses bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-fg-secondary">Expenses</span>
                  <span className="text-sm font-semibold text-status-red-fg">
                    {formatCurrency(expensesTotal)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-status-red transition-all"
                    style={{
                      width:
                        revenueThisMonth + expensesTotal > 0
                          ? `${(expensesTotal / (revenueThisMonth + expensesTotal)) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Net income */}
            <div className="mt-4 pt-4 border-t border-edge">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fg">Net Income</span>
                <span
                  className={`text-lg font-bold ${
                    revenueThisMonth - expensesTotal >= 0
                      ? "text-status-green-fg"
                      : "text-status-red-fg"
                  }`}
                >
                  {formatCurrency(revenueThisMonth - expensesTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

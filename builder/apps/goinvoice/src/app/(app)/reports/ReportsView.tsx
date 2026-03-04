"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

interface RevenueDataPoint {
  month: string;
  amount: number;
}

interface ExpenseDataPoint {
  month: string;
  amount: number;
}

interface CategoryTotal {
  category: string;
  amount: number;
}

interface ProfitLossDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface AgingInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  daysOverdue: number;
}

interface AgingBucket {
  label: string;
  invoices: AgingInvoice[];
  total: number;
}

interface ClientSummaryItem {
  id: string;
  name: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  invoiceCount: number;
}

interface ReportsViewProps {
  revenueData: RevenueDataPoint[];
  totalInvoiced: number;
  totalCollected: number;
  expenseData: ExpenseDataPoint[];
  topCategories: CategoryTotal[];
  profitLossData: ProfitLossDataPoint[];
  agingBuckets: AgingBucket[];
  clientSummary: ClientSummaryItem[];
}

const TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "expenses", label: "Expenses" },
  { key: "profitloss", label: "Profit & Loss" },
  { key: "ar", label: "Outstanding AR" },
  { key: "clients", label: "Client Summary" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  TRAVEL: "Travel",
  MEALS: "Meals",
  SUPPLIES: "Supplies",
  SOFTWARE: "Software",
  UTILITIES: "Utilities",
  RENT: "Rent",
  MARKETING: "Marketing",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

function BarChart({
  data,
  color = "bg-accent",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 h-48">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center justify-end h-full"
        >
          <div className="relative w-full flex justify-center mb-1">
            {d.value > 0 && (
              <span className="text-[10px] text-fg-muted whitespace-nowrap">
                {formatCurrency(d.value)}
              </span>
            )}
          </div>
          <div
            className={`w-full rounded-t-sm ${color} transition-all min-h-[2px]`}
            style={{
              height: `${Math.max((d.value / maxValue) * 160, 2)}px`,
            }}
          />
          <span className="text-[10px] text-fg-muted mt-1.5 whitespace-nowrap">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function DualBarChart({
  data,
}: {
  data: {
    label: string;
    value1: number;
    value2: number;
  }[];
}) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.value1, d.value2)),
    1
  );

  return (
    <div className="flex items-end gap-1.5 h-48">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center justify-end h-full"
        >
          <div className="flex gap-0.5 w-full items-end justify-center h-[160px]">
            <div
              className="flex-1 bg-status-green rounded-t-sm transition-all min-h-[2px]"
              style={{
                height: `${Math.max((d.value1 / maxValue) * 150, 2)}px`,
              }}
            />
            <div
              className="flex-1 bg-status-red rounded-t-sm transition-all min-h-[2px]"
              style={{
                height: `${Math.max((d.value2 / maxValue) * 150, 2)}px`,
              }}
            />
          </div>
          <span className="text-[10px] text-fg-muted mt-1.5 whitespace-nowrap">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueTab({
  revenueData,
  totalInvoiced,
  totalCollected,
}: {
  revenueData: RevenueDataPoint[];
  totalInvoiced: number;
  totalCollected: number;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-edge rounded-xl p-5">
          <p className="text-sm font-medium text-fg-muted">Total Invoiced</p>
          <p className="text-2xl font-bold text-fg mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
          <p className="text-xs text-fg-muted mt-1">
            Sent, paid, and overdue invoices
          </p>
        </div>
        <div className="bg-card border border-edge rounded-xl p-5">
          <p className="text-sm font-medium text-fg-muted">Total Collected</p>
          <p className="text-2xl font-bold text-status-green-fg mt-1">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-xs text-fg-muted mt-1">
            {totalInvoiced > 0
              ? `${((totalCollected / totalInvoiced) * 100).toFixed(1)}% collection rate`
              : "No invoices yet"}
          </p>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-card border border-edge rounded-xl p-5">
        <h3 className="text-base font-semibold text-fg mb-4">
          Monthly Revenue (Last 12 Months)
        </h3>
        <BarChart
          data={revenueData.map((d) => ({
            label: d.month,
            value: d.amount,
          }))}
        />
      </div>
    </div>
  );
}

function ExpensesTab({
  expenseData,
  topCategories,
}: {
  expenseData: ExpenseDataPoint[];
  topCategories: CategoryTotal[];
}) {
  const totalExpenses = topCategories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Monthly Expenses Chart */}
      <div className="bg-card border border-edge rounded-xl p-5">
        <h3 className="text-base font-semibold text-fg mb-4">
          Monthly Expenses (Last 12 Months)
        </h3>
        <BarChart
          data={expenseData.map((d) => ({
            label: d.month,
            value: d.amount,
          }))}
          color="bg-status-red"
        />
      </div>

      {/* Top Categories */}
      <div className="bg-card border border-edge rounded-xl p-5">
        <h3 className="text-base font-semibold text-fg mb-4">
          Expense Categories
        </h3>
        {topCategories.length === 0 ? (
          <p className="text-sm text-fg-muted">No expenses recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {topCategories.map((cat) => {
              const pct =
                totalExpenses > 0
                  ? ((cat.amount / totalExpenses) * 100).toFixed(1)
                  : "0";
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-fg-secondary">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-muted">{pct}%</span>
                      <span className="text-sm font-semibold text-fg">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{
                        width: `${totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-edge flex items-center justify-between">
              <span className="text-sm font-medium text-fg">
                Total Expenses
              </span>
              <span className="text-lg font-bold text-fg">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfitLossTab({
  profitLossData,
}: {
  profitLossData: ProfitLossDataPoint[];
}) {
  const totalRevenue = profitLossData.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = profitLossData.reduce((s, d) => s + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-edge rounded-xl p-5">
          <p className="text-sm font-medium text-fg-muted">Total Revenue</p>
          <p className="text-2xl font-bold text-status-green-fg mt-1">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-card border border-edge rounded-xl p-5">
          <p className="text-sm font-medium text-fg-muted">Total Expenses</p>
          <p className="text-2xl font-bold text-status-red-fg mt-1">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="bg-card border border-edge rounded-xl p-5">
          <p className="text-sm font-medium text-fg-muted">Net Profit</p>
          <p
            className={`text-2xl font-bold mt-1 ${totalProfit >= 0 ? "text-status-green-fg" : "text-status-red-fg"}`}
          >
            {formatCurrency(totalProfit)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-edge rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-fg">
            Monthly Profit & Loss
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-status-green" />
              <span className="text-xs text-fg-muted">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-status-red" />
              <span className="text-xs text-fg-muted">Expenses</span>
            </div>
          </div>
        </div>
        <DualBarChart
          data={profitLossData.map((d) => ({
            label: d.month,
            value1: d.revenue,
            value2: d.expenses,
          }))}
        />
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-card border border-edge rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-edge">
          <h3 className="text-base font-semibold text-fg">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left text-xs font-medium text-fg-muted px-5 py-3">
                  Month
                </th>
                <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                  Revenue
                </th>
                <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                  Expenses
                </th>
                <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                  Net Profit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {profitLossData.map((d) => (
                <tr key={d.month} className="hover:bg-hover transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-fg">
                    {d.month}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-status-green-fg">
                    {formatCurrency(d.revenue)}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-status-red-fg">
                    {formatCurrency(d.expenses)}
                  </td>
                  <td
                    className={`px-5 py-3 text-sm text-right font-semibold ${d.profit >= 0 ? "text-status-green-fg" : "text-status-red-fg"}`}
                  >
                    {formatCurrency(d.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-edge-strong">
                <td className="px-5 py-3 text-sm font-bold text-fg">Total</td>
                <td className="px-5 py-3 text-sm text-right font-bold text-status-green-fg">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="px-5 py-3 text-sm text-right font-bold text-status-red-fg">
                  {formatCurrency(totalExpenses)}
                </td>
                <td
                  className={`px-5 py-3 text-sm text-right font-bold ${totalProfit >= 0 ? "text-status-green-fg" : "text-status-red-fg"}`}
                >
                  {formatCurrency(totalProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ARTab({ agingBuckets }: { agingBuckets: AgingBucket[] }) {
  const totalOutstanding = agingBuckets.reduce((s, b) => s + b.total, 0);

  const bucketVariants: ("info" | "success" | "warning" | "error")[] = [
    "info",
    "success",
    "warning",
    "error",
  ];

  return (
    <div className="space-y-6">
      {/* Aging Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agingBuckets.map((bucket, i) => (
          <div
            key={bucket.label}
            className="bg-card border border-edge rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant={bucketVariants[i]}>{bucket.label}</Badge>
            </div>
            <p className="text-2xl font-bold text-fg">
              {formatCurrency(bucket.total)}
            </p>
            <p className="text-xs text-fg-muted mt-1">
              {bucket.invoices.length} invoice
              {bucket.invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Total Outstanding */}
      <div className="bg-card border border-edge rounded-xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-fg">
            Total Outstanding
          </span>
          <span className="text-2xl font-bold text-fg">
            {formatCurrency(totalOutstanding)}
          </span>
        </div>
      </div>

      {/* Invoice Lists by Bucket */}
      {agingBuckets.map((bucket, i) => {
        if (bucket.invoices.length === 0) return null;
        return (
          <div
            key={bucket.label}
            className="bg-card border border-edge rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-fg">
                  {bucket.label}
                </h3>
                <Badge variant={bucketVariants[i]}>
                  {bucket.invoices.length}
                </Badge>
              </div>
              <span className="text-sm font-semibold text-fg">
                {formatCurrency(bucket.total)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left text-xs font-medium text-fg-muted px-5 py-3">
                      Invoice
                    </th>
                    <th className="text-left text-xs font-medium text-fg-muted px-5 py-3">
                      Client
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Total
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Paid
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Balance
                    </th>
                    <th className="text-left text-xs font-medium text-fg-muted px-5 py-3">
                      Due Date
                    </th>
                    {i > 0 && (
                      <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                        Days Overdue
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {bucket.invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-hover transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-accent-fg">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-5 py-3 text-sm text-fg">
                        {inv.clientName}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-fg">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-fg-muted">
                        {formatCurrency(inv.amountPaid)}
                      </td>
                      <td className="px-5 py-3 text-sm text-right font-semibold text-fg">
                        {formatCurrency(inv.balance)}
                      </td>
                      <td className="px-5 py-3 text-sm text-fg-secondary">
                        {formatDate(inv.dueDate)}
                      </td>
                      {i > 0 && (
                        <td className="px-5 py-3 text-sm text-right">
                          <Badge
                            variant={
                              inv.daysOverdue > 60
                                ? "error"
                                : inv.daysOverdue > 30
                                  ? "warning"
                                  : "info"
                            }
                          >
                            {inv.daysOverdue} days
                          </Badge>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {totalOutstanding === 0 && (
        <div className="bg-card border border-edge rounded-xl p-10 text-center">
          <p className="text-sm text-fg-muted">
            No outstanding invoices. All accounts are current.
          </p>
        </div>
      )}
    </div>
  );
}

function ClientsTab({
  clientSummary,
}: {
  clientSummary: ClientSummaryItem[];
}) {
  const totalBilledAll = clientSummary.reduce((s, c) => s + c.totalBilled, 0);

  return (
    <div className="space-y-6">
      {clientSummary.length === 0 ? (
        <div className="bg-card border border-edge rounded-xl p-10 text-center">
          <p className="text-sm text-fg-muted">
            No client revenue data to display.
          </p>
        </div>
      ) : (
        <>
          {/* Client Revenue Table */}
          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-edge">
              <h3 className="text-base font-semibold text-fg">
                Revenue by Client
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left text-xs font-medium text-fg-muted px-5 py-3">
                      Client
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Invoices
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Total Billed
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Total Paid
                    </th>
                    <th className="text-right text-xs font-medium text-fg-muted px-5 py-3">
                      Outstanding
                    </th>
                    <th className="text-left text-xs font-medium text-fg-muted px-5 py-3 w-48">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {clientSummary.map((client) => {
                    const pct =
                      totalBilledAll > 0
                        ? (client.totalBilled / totalBilledAll) * 100
                        : 0;
                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-hover transition-colors"
                      >
                        <td className="px-5 py-3 text-sm font-medium text-fg">
                          {client.name}
                        </td>
                        <td className="px-5 py-3 text-sm text-right text-fg-muted">
                          {client.invoiceCount}
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-semibold text-fg">
                          {formatCurrency(client.totalBilled)}
                        </td>
                        <td className="px-5 py-3 text-sm text-right text-status-green-fg">
                          {formatCurrency(client.totalPaid)}
                        </td>
                        <td className="px-5 py-3 text-sm text-right">
                          {client.outstanding > 0 ? (
                            <span className="text-status-amber-fg font-semibold">
                              {formatCurrency(client.outstanding)}
                            </span>
                          ) : (
                            <span className="text-fg-muted">
                              {formatCurrency(0)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-fg-muted w-10 text-right">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-edge-strong">
                    <td className="px-5 py-3 text-sm font-bold text-fg">
                      Total
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-fg-muted">
                      {clientSummary.reduce(
                        (s, c) => s + c.invoiceCount,
                        0
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-fg">
                      {formatCurrency(totalBilledAll)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-status-green-fg">
                      {formatCurrency(
                        clientSummary.reduce((s, c) => s + c.totalPaid, 0)
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-status-amber-fg">
                      {formatCurrency(
                        clientSummary.reduce(
                          (s, c) => s + c.outstanding,
                          0
                        )
                      )}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportsView({
  revenueData,
  totalInvoiced,
  totalCollected,
  expenseData,
  topCategories,
  profitLossData,
  agingBuckets,
  clientSummary,
}: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("revenue");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Financial reports and analytics"
      />

      {/* Tab Navigation */}
      <div className="border-b border-edge">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-accent-fg text-accent-fg"
                  : "border-transparent text-fg-muted hover:text-fg-secondary hover:border-edge"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "revenue" && (
        <RevenueTab
          revenueData={revenueData}
          totalInvoiced={totalInvoiced}
          totalCollected={totalCollected}
        />
      )}
      {activeTab === "expenses" && (
        <ExpensesTab
          expenseData={expenseData}
          topCategories={topCategories}
        />
      )}
      {activeTab === "profitloss" && (
        <ProfitLossTab profitLossData={profitLossData} />
      )}
      {activeTab === "ar" && <ARTab agingBuckets={agingBuckets} />}
      {activeTab === "clients" && (
        <ClientsTab clientSummary={clientSummary} />
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import StatsCard from "./StatsCard";
import RevenueChart from "./RevenueChart";
import ActivityFeed from "./ActivityFeed";
import Link from "next/link";

interface DashboardClientProps {
  totalReceivable: number;
  overdueCount: number;
  overdueTotal: number;
  draftCount: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  activities: { type: "invoice" | "payment" | "expense"; description: string; amount: number; date: string; status?: string }[];
  chartData: { month: string; revenue: number; expenses: number }[];
}

export default function DashboardClient({
  totalReceivable,
  overdueCount,
  overdueTotal,
  draftCount,
  revenueThisMonth,
  expensesThisMonth,
  activities,
  chartData,
}: DashboardClientProps) {
  // Process any due recurring invoices on dashboard load (fire and forget)
  useEffect(() => {
    fetch("/api/recurring/process", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Receivable"
          value={`$${totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Overdue"
          value={`$${overdueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`${overdueCount} invoice${overdueCount !== 1 ? "s" : ""}`}
          trend={overdueCount > 0 ? "down" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
        <StatsCard
          title="Revenue This Month"
          value={`$${revenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
        />
        <StatsCard
          title="Expenses This Month"
          value={`$${expensesThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
            </svg>
          }
        />
      </div>

      {/* Action Items */}
      {(overdueCount > 0 || draftCount > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Action Items</h2>
          <div className="space-y-2">
            {overdueCount > 0 && (
              <Link href="/invoices?status=OVERDUE" className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""} need attention
              </Link>
            )}
            {draftCount > 0 && (
              <Link href="/invoices?status=DRAFT" className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                {draftCount} draft invoice{draftCount !== 1 ? "s" : ""} ready to send
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue vs Expenses</h2>
          <RevenueChart data={chartData} />
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
          <ActivityFeed items={activities} />
        </div>
      </div>
    </div>
  );
}

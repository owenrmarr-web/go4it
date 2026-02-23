"use client";

import { useState, useEffect } from "react";
import DateRangePicker from "./DateRangePicker";
import Link from "next/link";

interface CategoryBreakdown {
  name: string;
  total: number;
  percentage: number;
  count: number;
}

interface ExpensesSummaryData {
  total: number;
  categories: CategoryBreakdown[];
}

export default function ExpensesSummaryClient() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  );
  const [data, setData] = useState<ExpensesSummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/expenses-summary?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) setData(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expenses by Category</h1>
      </div>

      <div className="mb-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
        />
      </div>

      {loading && <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>}

      {data && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">${data.total.toFixed(2)}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            {data.categories.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Count</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((cat) => (
                    <tr key={cat.name} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 text-gray-700 dark:text-gray-300">{cat.name}</td>
                      <td className="py-3 text-right text-gray-500 dark:text-gray-400">{cat.count}</td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-gray-100">${cat.total.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{cat.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No expenses in this period</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

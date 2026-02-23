"use client";

import { useState, useEffect } from "react";
import DateRangePicker from "./DateRangePicker";
import Link from "next/link";

interface CategoryBreakdown {
  name: string;
  total: number;
}

interface ProfitLossData {
  income: number;
  expenses: number;
  net: number;
  incomeByCategory: CategoryBreakdown[];
  expensesByCategory: CategoryBreakdown[];
}

export default function ProfitLossClient() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  );
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profit & Loss</h1>
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
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Income</p>
              <p className="text-2xl font-bold text-green-600">${data.income.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
              <p className="text-2xl font-bold text-red-600">${data.expenses.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
              <p className={`text-2xl font-bold ${data.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${data.net.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Income Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Income by Category</h2>
            {data.incomeByCategory.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {data.incomeByCategory.map((cat) => (
                    <tr key={cat.name} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-700 dark:text-gray-300">{cat.name}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">${cat.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="py-2 font-bold text-gray-900 dark:text-gray-100">Total Income</td>
                    <td className="py-2 text-right font-bold text-green-600">${data.income.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No income in this period</p>
            )}
          </div>

          {/* Expenses Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expenses by Category</h2>
            {data.expensesByCategory.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {data.expensesByCategory.map((cat) => (
                    <tr key={cat.name} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-700 dark:text-gray-300">{cat.name}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">${cat.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="py-2 font-bold text-gray-900 dark:text-gray-100">Total Expenses</td>
                    <td className="py-2 text-right font-bold text-red-600">${data.expenses.toFixed(2)}</td>
                  </tr>
                </tfoot>
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

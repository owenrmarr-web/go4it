"use client";

import { useState, useEffect } from "react";
import RevenueChart from "./RevenueChart";
import Link from "next/link";

interface MonthData {
  month: string;
  revenue: number;
  expenses: number;
}

export default function RevenueClient() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports/revenue");
        if (res.ok) setData(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Revenue Trend</h1>
      </div>

      {loading && <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>}

      {!loading && (
        <div className="space-y-6">
          <RevenueChart data={data} />

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Month</th>
                  <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                  <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Expenses</th>
                  <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.month} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 text-gray-700 dark:text-gray-300">{item.month}</td>
                    <td className="py-2 text-right text-green-600 font-medium">${item.revenue.toFixed(2)}</td>
                    <td className="py-2 text-right text-red-600 font-medium">${item.expenses.toFixed(2)}</td>
                    <td className={`py-2 text-right font-bold ${item.revenue - item.expenses >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${(item.revenue - item.expenses).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                  <td className="py-2 font-bold text-gray-900 dark:text-gray-100">Total</td>
                  <td className="py-2 text-right font-bold text-green-600">${totalRevenue.toFixed(2)}</td>
                  <td className="py-2 text-right font-bold text-red-600">${totalExpenses.toFixed(2)}</td>
                  <td className={`py-2 text-right font-bold ${totalRevenue - totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${(totalRevenue - totalExpenses).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

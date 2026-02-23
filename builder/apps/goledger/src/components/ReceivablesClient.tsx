"use client";

import { useState, useEffect } from "react";
import AgingTable from "./AgingTable";
import StatusBadge from "./StatusBadge";
import Link from "next/link";

interface AgingBucket {
  label: string;
  count: number;
  total: number;
}

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  daysOverdue: number;
}

interface ReceivablesData {
  buckets: AgingBucket[];
  overdueInvoices: OverdueInvoice[];
}

export default function ReceivablesClient() {
  const [data, setData] = useState<ReceivablesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports/receivables");
        if (res.ok) setData(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Accounts Receivable Aging</h1>
      </div>

      {loading && <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>}

      {data && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Aging Summary</h2>
            <AgingTable buckets={data.buckets} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Overdue Invoices</h2>
            {data.overdueInvoices.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Client</th>
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Balance</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2">
                        <Link href={`/invoices/${inv.id}`} className="text-purple-600 hover:text-purple-700 font-medium">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{inv.clientName}</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">${(inv.total - inv.amountPaid).toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <StatusBadge status={inv.daysOverdue > 60 ? "OVERDUE" : inv.daysOverdue > 30 ? "PARTIAL" : "SENT"} />
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{inv.daysOverdue}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No overdue invoices</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

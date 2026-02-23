"use client";

import { useState } from "react";
import DateRangePicker from "./DateRangePicker";
import { toast } from "sonner";
import Link from "next/link";

export default function ExportClient() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0]
  );
  const [exportInvoices, setExportInvoices] = useState(true);
  const [exportPayments, setExportPayments] = useState(true);
  const [exportExpenses, setExportExpenses] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    const types = [];
    if (exportInvoices) types.push("invoices");
    if (exportPayments) types.push("payments");
    if (exportExpenses) types.push("expenses");

    if (types.length === 0) {
      toast.error("Select at least one data type to export");
      return;
    }

    setDownloading(true);
    try {
      const params = new URLSearchParams({
        type: types.join(","),
        startDate,
        endDate,
      });
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goledger-export-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Export Data</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Date Range</h2>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Data to Export</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportInvoices}
                onChange={(e) => setExportInvoices(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-400"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Invoices</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportPayments}
                onChange={(e) => setExportPayments(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-400"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Payments</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportExpenses}
                onChange={(e) => setExportExpenses(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-400"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Expenses</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full gradient-brand text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? "Generating CSV..." : "Download CSV"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";

interface Estimate {
  id: string;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiresAt: string | null;
  total: number;
  client: { name: string };
}

interface EstimatesClientProps {
  estimates: Estimate[];
}

const STATUS_OPTIONS = ["All", "DRAFT", "SENT", "ACCEPTED", "DECLINED", "CONVERTED"];

export default function EstimatesClient({ estimates }: EstimatesClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = estimates.filter((est) => {
    if (statusFilter !== "All" && est.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        est.estimateNumber.toLowerCase().includes(q) ||
        est.client.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (estimates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Estimates</h1>
        </div>
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          }
          title="No estimates yet"
          description="Create your first estimate to send to clients."
          actionLabel="New Estimate"
          actionHref="/estimates/new"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Estimates</h1>
        <Link
          href="/estimates/new"
          className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm"
        >
          New Estimate
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search estimates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Estimate #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Expires</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Total</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((est) => (
                <tr
                  key={est.id}
                  onClick={() => router.push(`/estimates/${est.id}`)}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{est.estimateNumber}</td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{est.client.name}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(est.issueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                    {est.expiresAt ? new Date(est.expiresAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-right">${est.total.toFixed(2)}</td>
                  <td className="py-3 px-4"><StatusBadge status={est.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">No estimates match your filters.</p>
        )}
      </div>
    </div>
  );
}

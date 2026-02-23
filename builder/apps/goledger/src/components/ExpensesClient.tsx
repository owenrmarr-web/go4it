"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmptyState from "./EmptyState";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  method: string | null;
  isBillable: boolean;
  category: { id: string; name: string } | null;
  client: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface ExpensesClientProps {
  expenses: Expense[];
  categories: Category[];
}

export default function ExpensesClient({ expenses, categories }: ExpensesClientProps) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = expenses.filter((exp) => {
    if (categoryFilter !== "All" && exp.category?.id !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        exp.description.toLowerCase().includes(q) ||
        (exp.vendor?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const totalFiltered = filtered.reduce((sum, exp) => sum + exp.amount, 0);

  if (expenses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
        </div>
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          title="No expenses yet"
          description="Track your business expenses to stay on top of your finances."
          actionLabel="Add Expense"
          actionHref="/expenses/new"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
        <Link
          href="/expenses/new"
          className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm"
        >
          Add Expense
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm w-64"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          Total: <span className="font-bold text-gray-900 dark:text-gray-100">${totalFiltered.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Vendor</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => (
                <tr
                  key={exp.id}
                  onClick={() => router.push(`/expenses/${exp.id}`)}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                    {exp.description}
                    {exp.isBillable && (
                      <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Billable</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{exp.category?.name ?? "-"}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{exp.vendor ?? "-"}</td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-right font-medium">${exp.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">No expenses match your filters.</p>
        )}
      </div>
    </div>
  );
}

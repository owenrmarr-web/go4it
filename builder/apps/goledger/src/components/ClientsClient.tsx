"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmptyState from "./EmptyState";

interface ClientItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  role: string;
  _count: { invoices: number; expenses: number };
}

interface ClientsClientProps {
  clients: ClientItem[];
}

const ROLE_TABS = ["All", "CUSTOMER", "VENDOR"];

export default function ClientsClient({ clients }: ClientsClientProps) {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = clients.filter((client) => {
    if (roleFilter !== "All") {
      if (roleFilter === "CUSTOMER" && !["CUSTOMER", "BOTH"].includes(client.role)) return false;
      if (roleFilter === "VENDOR" && !["VENDOR", "BOTH"].includes(client.role)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        client.name.toLowerCase().includes(q) ||
        (client.email?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  if (clients.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
        </div>
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
          title="No clients yet"
          description="Add your first client to start creating invoices and estimates."
          actionLabel="Add Client"
          actionHref="/clients/new"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
        <Link
          href="/clients/new"
          className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm"
        >
          Add Client
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm w-64"
        />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                roleFilter === tab
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab === "All" ? "All" : tab === "CUSTOMER" ? "Customers" : "Vendors"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Phone</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{client.name}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{client.email ?? "-"}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{client.phone ?? "-"}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{client.type}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{client.role}</td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-right">{client._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">No clients match your filters.</p>
        )}
      </div>
    </div>
  );
}

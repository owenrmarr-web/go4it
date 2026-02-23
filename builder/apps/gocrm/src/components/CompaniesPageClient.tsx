"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CompanyData {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  contactCount: number;
  totalDealValue: number;
}

export default function CompaniesPageClient({
  initialCompanies,
}: {
  initialCompanies: CompanyData[];
}) {
  const router = useRouter();
  const [companies] = useState(initialCompanies);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q))
    );
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Company created");
      setShowForm(false);
      const newCompany = await res.json();
      router.push(`/companies/${newCompany.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create company");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Companies</h1>
        <button
          onClick={() => setShowForm(true)}
          className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
        >
          + Add Company
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input-border bg-input-bg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-12 text-center">
          <svg
            className="w-12 h-12 text-text-faint mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
            />
          </svg>
          <p className="text-text-muted mb-3">
            {search ? "No companies match your search" : "No companies yet"}
          </p>
          {!search && (
            <button
              onClick={() => setShowForm(true)}
              className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
            >
              Add your first company
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Industry
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Contacts
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Total Deal Value
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => router.push(`/companies/${company.id}`)}
                    className="border-b border-border-subtle hover:bg-hover-bg cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">
                        {company.name}
                      </p>
                      <p className="text-xs text-text-muted sm:hidden">
                        {company.industry || "No industry"}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-text-secondary">
                        {company.industry || "\u2014"}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-text-secondary">
                        {company.contactCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm font-medium text-text-primary">
                        {company.totalDealValue > 0
                          ? `$${company.totalDealValue.toLocaleString()}`
                          : "\u2014"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-text-secondary">
                        {company.phone || "\u2014"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">
                New Company
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-text-faint hover:text-text-secondary"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Company Name *
                </label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Industry
                  </label>
                  <input
                    name="industry"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Website
                </label>
                <input
                  name="website"
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Address
                </label>
                <input
                  name="address"
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    City
                  </label>
                  <input
                    name="city"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    State
                  </label>
                  <input
                    name="state"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Zip
                  </label>
                  <input
                    name="zip"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const stageColors: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700",
  PROSPECT: "bg-orange-50 text-orange-700",
  CUSTOMER: "bg-green-50 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  CHURNED: "bg-red-50 text-red-700",
};

const dealStageColors: Record<string, string> = {
  INTERESTED: "bg-blue-50 text-blue-700",
  QUOTED: "bg-orange-50 text-orange-700",
  COMMITTED: "bg-purple-50 text-purple-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
};

interface CompanyDetailProps {
  company: {
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
    contacts: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      stage: string;
      jobTitle: string | null;
    }[];
    deals: {
      id: string;
      title: string;
      value: number;
      stage: string;
      expectedCloseDate: string | null;
      contact: { firstName: string; lastName: string };
    }[];
  };
}

export default function CompanyDetailClient({ company }: CompanyDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Company updated");
      setEditing(false);
      router.refresh();
    } else {
      toast.error("Failed to update company");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Delete this company? Contacts and deals linked to this company will lose their company association."
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Company deleted");
      router.push("/companies");
    } else {
      toast.error("Failed to delete company");
    }
    setDeleting(false);
  };

  const totalDealValue = company.deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => router.push("/companies")}
        className="text-sm text-text-muted hover:text-text-secondary mb-4 flex items-center gap-1"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Companies
      </button>

      {/* Company Info Card */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">
              {company.name}
            </h1>
            {company.industry && (
              <p className="text-text-secondary">{company.industry}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm bg-hover-bg text-text-secondary rounded-lg hover:bg-hover-bg"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
            >
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Company Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border-subtle">
          {company.website && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Website</p>
              <a
                href={
                  company.website.startsWith("http")
                    ? company.website
                    : `https://${company.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:underline"
              >
                {company.website}
              </a>
            </div>
          )}
          {company.phone && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Phone</p>
              <p className="text-sm text-text-primary">{company.phone}</p>
            </div>
          )}
          {(company.address || company.city || company.state) && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Address</p>
              <p className="text-sm text-text-primary">
                {[company.address, company.city, company.state]
                  .filter(Boolean)
                  .join(", ")}
                {company.zip ? ` ${company.zip}` : ""}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted mb-0.5">Total Deal Value</p>
            <p className="text-sm font-medium text-text-primary">
              {totalDealValue > 0
                ? `$${totalDealValue.toLocaleString()}`
                : "\u2014"}
            </p>
          </div>
        </div>
        {company.notes && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <p className="text-xs text-text-muted mb-1">Notes</p>
            <p className="text-sm text-text-secondary">{company.notes}</p>
          </div>
        )}
      </div>

      {/* Contacts Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Contacts ({company.contacts.length})
        </h2>
        {company.contacts.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8 text-center">
            <p className="text-text-muted">
              No contacts at this company yet
            </p>
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
                      Email
                    </th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Job Title
                    </th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                      Stage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {company.contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      className="border-b border-border-subtle hover:bg-hover-bg cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-text-muted sm:hidden">
                          {contact.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm text-text-secondary">
                          {contact.email || "\u2014"}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-text-secondary">
                          {contact.jobTitle || "\u2014"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            stageColors[contact.stage] || ""
                          }`}
                        >
                          {contact.stage.charAt(0) +
                            contact.stage.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Deals Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Deals ({company.deals.length})
        </h2>
        {company.deals.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8 text-center">
            <p className="text-text-muted">
              No deals for this company yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {company.deals.map((deal) => (
              <div
                key={deal.id}
                onClick={() => router.push(`/deals?highlight=${deal.id}`)}
                className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4 flex items-center justify-between cursor-pointer hover:bg-hover-bg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {deal.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {deal.contact.firstName} {deal.contact.lastName}
                    {deal.expectedCloseDate &&
                      ` \u00B7 Close: ${new Date(
                        deal.expectedCloseDate
                      ).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">
                    ${deal.value.toLocaleString()}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      dealStageColors[deal.stage] || ""
                    }`}
                  >
                    {deal.stage.charAt(0) + deal.stage.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Company Modal */}
      {editing && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">
                Edit Company
              </h2>
              <button
                onClick={() => setEditing(false)}
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
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Company Name *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={company.name}
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
                    defaultValue={company.industry || ""}
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    defaultValue={company.phone || ""}
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
                  defaultValue={company.website || ""}
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Address
                </label>
                <input
                  name="address"
                  defaultValue={company.address || ""}
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
                    defaultValue={company.city || ""}
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    State
                  </label>
                  <input
                    name="state"
                    defaultValue={company.state || ""}
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Zip
                  </label>
                  <input
                    name="zip"
                    defaultValue={company.zip || ""}
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
                  defaultValue={company.notes || ""}
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

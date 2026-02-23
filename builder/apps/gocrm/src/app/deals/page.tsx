"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STAGES = ["INTERESTED", "QUOTED", "COMMITTED", "WON", "LOST"] as const;

const stageConfig: Record<
  string,
  { label: string; color: string; bg: string; headerBg: string }
> = {
  INTERESTED: {
    label: "Interested",
    color: "text-blue-700",
    bg: "bg-blue-50",
    headerBg: "bg-blue-500",
  },
  QUOTED: {
    label: "Quoted",
    color: "text-orange-700",
    bg: "bg-orange-50",
    headerBg: "bg-orange-500",
  },
  COMMITTED: {
    label: "Committed",
    color: "text-purple-700",
    bg: "bg-purple-50",
    headerBg: "bg-purple-500",
  },
  WON: {
    label: "Won",
    color: "text-green-700",
    bg: "bg-green-50",
    headerBg: "bg-green-500",
  },
  LOST: {
    label: "Lost",
    color: "text-red-600",
    bg: "bg-red-50",
    headerBg: "bg-red-400",
  },
};

interface DealData {
  id: string;
  title: string;
  value: number;
  stage: string;
  expectedCloseDate: string | null;
  notes: string | null;
  contact: { id: string; firstName: string; lastName: string };
  company: { id: string; name: string } | null;
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  companyId: string | null;
}

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealData[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [stageFilter, setStageFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch("/api/deals"),
        fetch("/api/contacts"),
      ]);

      if (dealsRes.ok) {
        const dealsData = await dealsRes.json();
        setDeals(dealsData);
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(
          contactsData.map((c: { id: string; firstName: string; lastName: string; companyId: string | null }) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            companyId: c.companyId,
          }))
        );
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });

    if (res.ok) {
      const updated = await res.json();
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stage: updated.stage } : d
        )
      );
      toast.success(`Moved to ${stageConfig[newStage]?.label || newStage}`);
    } else {
      toast.error("Failed to update deal");
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(formData);
    data.value = parseFloat(data.value as string) || 0;

    // Auto-set companyId from the selected contact
    const selectedContact = contacts.find((c) => c.id === data.contactId);
    if (selectedContact?.companyId) {
      data.companyId = selectedContact.companyId;
    }

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Deal created");
      setShowForm(false);
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create deal");
    }
    setLoading(false);
  };

  const filteredDeals =
    stageFilter && view === "list"
      ? deals.filter((d) => d.stage === stageFilter)
      : deals;

  const dealsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage);
      return acc;
    },
    {} as Record<string, DealData[]>
  );

  if (loadingData) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Deals Pipeline</h1>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-hover-bg rounded-lg p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === "kanban"
                  ? "bg-surface text-text-primary shadow-sm font-medium"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === "list"
                  ? "bg-surface text-text-primary shadow-sm font-medium"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              List
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
          >
            + Add Deal
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const config = stageConfig[stage];
            const stageDeals = dealsByStage[stage] || [];
            const totalValue = stageDeals.reduce(
              (sum, d) => sum + d.value,
              0
            );

            return (
              <div
                key={stage}
                className="flex-shrink-0 w-72 bg-surface-inset rounded-xl border border-border-subtle"
              >
                {/* Column Header */}
                <div
                  className={`${config.headerBg} rounded-t-xl px-4 py-3 text-white`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{config.label}</h3>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    ${totalValue.toLocaleString()}
                  </p>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-3 min-h-[100px]">
                  {stageDeals.length === 0 ? (
                    <p className="text-xs text-text-faint text-center py-4">
                      No deals
                    </p>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="bg-surface rounded-lg border border-border-subtle shadow-sm p-3"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-text-primary leading-tight">
                            {deal.title}
                          </p>
                          {/* Stage change dropdown */}
                          <select
                            value={deal.stage}
                            onChange={(e) =>
                              handleStageChange(deal.id, e.target.value)
                            }
                            className="text-xs border border-border-default rounded px-1 py-0.5 text-text-muted bg-transparent cursor-pointer shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {stageConfig[s].label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-xs text-text-muted mb-1">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-text-primary">
                            ${deal.value.toLocaleString()}
                          </span>
                          {deal.expectedCloseDate && (
                            <span className="text-xs text-text-faint">
                              {new Date(
                                deal.expectedCloseDate
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {/* Stage Filter */}
          <div className="mb-4">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input-border bg-input-bg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            >
              <option value="">All Stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageConfig[s].label}
                </option>
              ))}
            </select>
          </div>

          {filteredDeals.length === 0 ? (
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
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <p className="text-text-muted mb-3">
                {stageFilter
                  ? "No deals in this stage"
                  : "No deals yet"}
              </p>
              {!stageFilter && (
                <button
                  onClick={() => setShowForm(true)}
                  className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
                >
                  Create your first deal
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
                        Title
                      </th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                        Contact
                      </th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                        Company
                      </th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                        Value
                      </th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                        Stage
                      </th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Close Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.map((deal) => {
                      const config = stageConfig[deal.stage];
                      return (
                        <tr
                          key={deal.id}
                          className="border-b border-border-subtle hover:bg-hover-bg cursor-pointer transition-colors"
                          onClick={() =>
                            router.push(
                              `/contacts/${deal.contact.id}`
                            )
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-text-primary">
                              {deal.title}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-sm text-text-secondary">
                              {deal.contact.firstName}{" "}
                              {deal.contact.lastName}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-sm text-text-secondary">
                              {deal.company?.name || "\u2014"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-text-primary">
                              ${deal.value.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${config?.bg || ""} ${config?.color || ""}`}
                            >
                              {config?.label || deal.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-sm text-text-muted">
                              {deal.expectedCloseDate
                                ? new Date(
                                    deal.expectedCloseDate
                                  ).toLocaleDateString()
                                : "\u2014"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Deal Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">
                New Deal
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
                  Title *
                </label>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Contact *
                </label>
                <select
                  name="contactId"
                  required
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a contact...
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Value ($)
                  </label>
                  <input
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="0"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Stage
                  </label>
                  <select
                    name="stage"
                    defaultValue="INTERESTED"
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {stageConfig[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Expected Close Date
                </label>
                <input
                  name="expectedCloseDate"
                  type="date"
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
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
                  {loading ? "Creating..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

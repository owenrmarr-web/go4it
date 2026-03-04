"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PlusIcon, DocumentIcon, TrashIcon, PencilIcon } from "@/components/Icons";
import EstimateForm from "./EstimateForm";

interface EstimateSummary {
  id: string;
  estimateNumber: string;
  clientId: string;
  clientName: string;
  status: string;
  issueDate: string;
  expiresAt: string | null;
  total: number;
}

interface EstimateListProps {
  initialEstimates: EstimateSummary[];
}

const STATUS_TABS = ["All", "Draft", "Sent", "Accepted", "Declined"] as const;

const STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "error" | "warning" | "neutral"> = {
  ACCEPTED: "success",
  SENT: "info",
  DECLINED: "error",
  EXPIRED: "warning",
  DRAFT: "neutral",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EstimateList({ initialEstimates }: EstimateListProps) {
  const router = useRouter();
  const [estimates, setEstimates] = useState(initialEstimates);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<EstimateSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EstimateSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let result = estimates;

    if (activeTab !== "All") {
      const statusFilter = activeTab.toUpperCase();
      result = result.filter((e) => e.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.estimateNumber.toLowerCase().includes(q) ||
          e.clientName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [estimates, activeTab, search]);

  async function refreshEstimates() {
    try {
      const res = await fetch("/api/estimates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEstimates(
        data.map(
          (e: {
            id: string;
            estimateNumber: string;
            clientId: string;
            client: { name: string };
            status: string;
            issueDate: string;
            expiresAt: string | null;
            total: number;
          }) => ({
            id: e.id,
            estimateNumber: e.estimateNumber,
            clientId: e.clientId,
            clientName: e.client.name,
            status: e.status,
            issueDate: e.issueDate,
            expiresAt: e.expiresAt,
            total: e.total,
          })
        )
      );
    } catch {
      toast.error("Failed to refresh estimates");
    }
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingEstimate(null);
    refreshEstimates();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/estimates/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Estimate deleted");
      setDeleteTarget(null);
      refreshEstimates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete estimate");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Estimates"
        subtitle="Create and manage estimates for your clients"
        action={
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="w-4 h-4" />
            New Estimate
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Tabs */}
        <div className="flex gap-1 rounded-lg bg-elevated p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-card text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search estimates..."
          className="sm:ml-auto sm:w-72"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-edge">
          <EmptyState
            icon={<DocumentIcon />}
            message={
              search || activeTab !== "All"
                ? "No estimates found"
                : "No estimates yet"
            }
            description={
              search || activeTab !== "All"
                ? "Try adjusting your search or filter."
                : "Create your first estimate to get started."
            }
            actionLabel={!search && activeTab === "All" ? "New Estimate" : undefined}
            onAction={!search && activeTab === "All" ? () => setShowForm(true) : undefined}
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Estimate #
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Client
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Status
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Issue Date
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Expires
                  </th>
                  <th className="text-right font-medium text-fg-muted px-4 py-3">
                    Total
                  </th>
                  <th className="text-right font-medium text-fg-muted px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((estimate) => (
                  <tr
                    key={estimate.id}
                    className="border-b border-edge last:border-b-0 hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => router.push(`/estimates/${estimate.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-fg">
                      {estimate.estimateNumber}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {estimate.clientName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[estimate.status] || "neutral"}>
                        {estimate.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {formatDate(estimate.issueDate)}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {estimate.expiresAt ? formatDate(estimate.expiresAt) : "--"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-fg">
                      {formatCurrency(estimate.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {estimate.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => {
                                setEditingEstimate(estimate);
                                setShowForm(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-hover text-fg-muted hover:text-fg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(estimate)}
                              className="p-1.5 rounded-lg hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <EstimateForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingEstimate(null);
        }}
        onSuccess={handleFormSuccess}
        editEstimateId={editingEstimate?.id}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Estimate"
        message={`Are you sure you want to delete estimate ${deleteTarget?.estimateNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import FormField from "@/components/FormField";
import UserAvatar from "@/components/UserAvatar";
import { CalendarIcon, PlusIcon, TrashIcon, CheckCircleIcon } from "@/components/Icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileUser {
  id: string;
  name: string | null;
  image: string | null;
  profileColor: string | null;
  profileEmoji: string | null;
}

interface Profile {
  id: string;
  employeeId: string;
  jobTitle: string;
  user: ProfileUser;
}

interface Reviewer {
  id: string;
  name: string | null;
}

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  profileId: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: string;
    employeeId: string;
    jobTitle: string;
    user: ProfileUser;
  };
  reviewedBy: Reviewer | null;
}

interface TimeOffClientProps {
  requests: TimeOffRequest[];
  profiles: Profile[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_OFF_TYPES = ["VACATION", "SICK", "PERSONAL", "BEREAVEMENT", "OTHER"] as const;

const STATUS_TABS = ["All", "PENDING", "APPROVED", "DENIED"] as const;

const TYPE_BADGE_VARIANT: Record<string, "info" | "error" | "warning" | "neutral"> = {
  VACATION: "info",
  SICK: "error",
  PERSONAL: "warning",
  BEREAVEMENT: "neutral",
  OTHER: "neutral",
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  DENIED: "error",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function computeTotalDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

function formatTypeLabel(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimeOffClient({ requests, profiles }: TimeOffClientProps) {
  const router = useRouter();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    profileId: "",
    type: "VACATION",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Detail / review modal
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<TimeOffRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (typeFilter !== "All" && r.type !== typeFilter) return false;
      return true;
    });
  }, [requests, statusFilter, typeFilter]);

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const totalDays = computeTotalDays(createForm.startDate, createForm.endDate);

  async function handleCreate() {
    if (!createForm.profileId || !createForm.startDate || !createForm.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (totalDays <= 0) {
      toast.error("End date must be on or after start date");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: createForm.profileId,
          type: createForm.type,
          startDate: createForm.startDate,
          endDate: createForm.endDate,
          totalDays,
          reason: createForm.reason || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create request");
      }

      toast.success("Time off request created");
      setShowCreateModal(false);
      setCreateForm({ profileId: "", type: "VACATION", startDate: "", endDate: "", reason: "" });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setCreateLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Review (Approve / Deny)
  // ---------------------------------------------------------------------------

  async function handleReview(status: "APPROVED" | "DENIED") {
    if (!selectedRequest) return;

    setReviewLoading(true);
    try {
      const res = await fetch(`/api/time-off/${selectedRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes: reviewNotes || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update request");
      }

      toast.success(`Request ${status.toLowerCase()}`);
      setSelectedRequest(null);
      setReviewNotes("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setReviewLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/time-off/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete request");
      }

      toast.success("Request deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete request");
    } finally {
      setDeleteLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const inputClasses =
    "w-full rounded-lg border border-edge-strong bg-input-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

  return (
    <div className="p-6">
      <PageHeader
        title="Time Off"
        subtitle="Manage employee time off requests"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4" />
            Request Time Off
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-elevated p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab
                  ? "bg-card text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg hover:bg-hover"
              }`}
            >
              {tab === "All" ? "All" : formatTypeLabel(tab)}
            </button>
          ))}
        </div>

        {/* Type filter dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={inputClasses + " sm:w-48"}
        >
          <option value="All">All Types</option>
          {TIME_OFF_TYPES.map((t) => (
            <option key={t} value={t}>
              {formatTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {/* Table or empty state */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          message="No time off requests"
          description="There are no time off requests matching the current filters."
          actionLabel="Request Time Off"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge bg-elevated">
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">End Date</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Total Days</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Submitted</th>
                  <th className="text-right px-4 py-3 font-medium text-fg-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-edge last:border-0 hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedRequest(req);
                      setReviewNotes("");
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={req.profile.user.name || ""}
                          image={req.profile.user.image}
                          profileColor={req.profile.user.profileColor}
                          profileEmoji={req.profile.user.profileEmoji}
                          size="sm"
                        />
                        <span className="font-medium text-fg truncate max-w-[160px]">
                          {req.profile.user.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_BADGE_VARIANT[req.type] || "neutral"}>
                        {formatTypeLabel(req.type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">{formatDate(req.startDate)}</td>
                    <td className="px-4 py-3 text-fg-secondary">{formatDate(req.endDate)}</td>
                    <td className="px-4 py-3 text-fg-secondary">{req.totalDays}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[req.status] || "neutral"}>
                        {formatTypeLabel(req.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{formatDate(req.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "PENDING" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(req);
                          }}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-hover transition-colors"
                          title="Delete request"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Create Modal                                                        */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Request Time Off"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Employee" required htmlFor="create-profile">
            <select
              id="create-profile"
              value={createForm.profileId}
              onChange={(e) => setCreateForm((f) => ({ ...f, profileId: e.target.value }))}
              className={inputClasses}
            >
              <option value="">Select an employee</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name || p.employeeId} - {p.jobTitle}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Type" required htmlFor="create-type">
            <select
              id="create-type"
              value={createForm.type}
              onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
              className={inputClasses}
            >
              {TIME_OFF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatTypeLabel(t)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required htmlFor="create-start">
              <input
                id="create-start"
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputClasses}
              />
            </FormField>
            <FormField label="End Date" required htmlFor="create-end">
              <input
                id="create-end"
                type="date"
                value={createForm.endDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                className={inputClasses}
              />
            </FormField>
          </div>

          {totalDays > 0 && (
            <p className="text-sm text-fg-secondary">
              Total days: <span className="font-semibold text-fg">{totalDays}</span>
            </p>
          )}

          <FormField label="Reason" htmlFor="create-reason">
            <textarea
              id="create-reason"
              rows={3}
              value={createForm.reason}
              onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Optional reason for the request..."
              className={inputClasses + " resize-none"}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createLoading}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* Detail / Review Modal                                               */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={!!selectedRequest}
        onClose={() => {
          setSelectedRequest(null);
          setReviewNotes("");
        }}
        title="Time Off Request"
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-5">
            {/* Employee info */}
            <div className="flex items-center gap-3">
              <UserAvatar
                name={selectedRequest.profile.user.name || ""}
                image={selectedRequest.profile.user.image}
                profileColor={selectedRequest.profile.user.profileColor}
                profileEmoji={selectedRequest.profile.user.profileEmoji}
                size="lg"
              />
              <div>
                <p className="font-semibold text-fg">
                  {selectedRequest.profile.user.name || "Unknown"}
                </p>
                <p className="text-sm text-fg-muted">{selectedRequest.profile.jobTitle}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-fg-muted mb-1">Type</p>
                <Badge variant={TYPE_BADGE_VARIANT[selectedRequest.type] || "neutral"}>
                  {formatTypeLabel(selectedRequest.type)}
                </Badge>
              </div>
              <div>
                <p className="text-fg-muted mb-1">Status</p>
                <Badge variant={STATUS_BADGE_VARIANT[selectedRequest.status] || "neutral"}>
                  {formatTypeLabel(selectedRequest.status)}
                </Badge>
              </div>
              <div>
                <p className="text-fg-muted mb-1">Start Date</p>
                <p className="text-fg font-medium">{formatDate(selectedRequest.startDate)}</p>
              </div>
              <div>
                <p className="text-fg-muted mb-1">End Date</p>
                <p className="text-fg font-medium">{formatDate(selectedRequest.endDate)}</p>
              </div>
              <div>
                <p className="text-fg-muted mb-1">Total Days</p>
                <p className="text-fg font-medium">{selectedRequest.totalDays}</p>
              </div>
              <div>
                <p className="text-fg-muted mb-1">Submitted</p>
                <p className="text-fg font-medium">{formatDate(selectedRequest.createdAt)}</p>
              </div>
            </div>

            {/* Reason */}
            {selectedRequest.reason && (
              <div>
                <p className="text-sm text-fg-muted mb-1">Reason</p>
                <p className="text-sm text-fg bg-elevated rounded-lg p-3">
                  {selectedRequest.reason}
                </p>
              </div>
            )}

            {/* Review info (if already reviewed) */}
            {selectedRequest.reviewedBy && (
              <div className="border-t border-edge pt-4">
                <p className="text-sm text-fg-muted mb-1">
                  Reviewed by{" "}
                  <span className="font-medium text-fg">
                    {selectedRequest.reviewedBy.name}
                  </span>
                  {selectedRequest.reviewedAt && (
                    <span> on {formatDate(selectedRequest.reviewedAt)}</span>
                  )}
                </p>
                {selectedRequest.reviewNotes && (
                  <p className="text-sm text-fg bg-elevated rounded-lg p-3 mt-2">
                    {selectedRequest.reviewNotes}
                  </p>
                )}
              </div>
            )}

            {/* Review actions (only for pending) */}
            {selectedRequest.status === "PENDING" && (
              <div className="border-t border-edge pt-4 space-y-4">
                <FormField label="Review Notes" htmlFor="review-notes">
                  <textarea
                    id="review-notes"
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className={inputClasses + " resize-none"}
                  />
                </FormField>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="danger"
                    onClick={() => handleReview("DENIED")}
                    loading={reviewLoading}
                  >
                    Deny
                  </Button>
                  <Button
                    onClick={() => handleReview("APPROVED")}
                    loading={reviewLoading}
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* Delete Confirm Dialog                                               */}
      {/* ------------------------------------------------------------------- */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message={`Are you sure you want to delete this time off request for ${
          deleteTarget?.profile.user.name || "this employee"
        }? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}

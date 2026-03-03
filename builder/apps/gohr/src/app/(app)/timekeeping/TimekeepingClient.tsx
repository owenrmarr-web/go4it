"use client";

import { useState, useMemo, useCallback } from "react";
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
import {
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@/components/Icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileUser {
  id: string;
  name: string | null;
  email: string;
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

interface TimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number | null;
  notes: string | null;
  status: string;
  profileId: string;
  profile: Profile;
}

interface TimekeepingClientProps {
  timeEntries: TimeEntry[];
  profiles: Profile[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayHeader(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

function formatDateSub(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

function computeHours(
  clockIn: string,
  clockOut: string | null,
  breakMinutes: number
): number | null {
  if (!clockOut) return null;
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = ms / (1000 * 60 * 60) - breakMinutes / 60;
  return Math.max(0, hours);
}

function formatHours(h: number | null): string {
  if (h == null) return "-";
  return h.toFixed(1);
}

const STATUS_BADGE: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  FLAGGED: "error",
};

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimekeepingClient({
  timeEntries,
  profiles,
}: TimekeepingClientProps) {
  const router = useRouter();

  // Week navigation
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);

  // Loading states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    profileId: "",
    date: "",
    clockIn: "",
    clockOut: "",
    breakMinutes: "0",
    notes: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    clockIn: "",
    clockOut: "",
    breakMinutes: "0",
    notes: "",
    status: "PENDING",
  });

  // Build lookup: profileId -> dateKey -> TimeEntry[]
  const entryMap = useMemo(() => {
    const map: Record<string, Record<string, TimeEntry[]>> = {};
    for (const entry of timeEntries) {
      const dk = dateKey(new Date(entry.date));
      if (!map[entry.profileId]) map[entry.profileId] = {};
      if (!map[entry.profileId][dk]) map[entry.profileId][dk] = [];
      map[entry.profileId][dk].push(entry);
    }
    return map;
  }, [timeEntries]);

  // Filter profiles that have at least one entry in the full dataset, plus include all for the dropdown
  const activeProfiles = useMemo(() => {
    const idsWithEntries = new Set(timeEntries.map((e) => e.profileId));
    // Show profiles that have entries in the visible week or any data at all
    return profiles.filter((p) => idsWithEntries.has(p.id));
  }, [profiles, timeEntries]);

  const displayProfiles = activeProfiles.length > 0 ? activeProfiles : [];

  // Totals per day
  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of weekDates) {
      const dk = dateKey(d);
      let sum = 0;
      for (const pid of Object.keys(entryMap)) {
        const entries = entryMap[pid]?.[dk] || [];
        for (const e of entries) {
          const h = e.totalHours ?? computeHours(e.clockIn, e.clockOut, e.breakMinutes);
          if (h != null) sum += h;
        }
      }
      totals[dk] = sum;
    }
    return totals;
  }, [entryMap, weekDates]);

  // Employee week total
  const employeeWeekTotal = useCallback(
    (profileId: string): number => {
      let sum = 0;
      for (const d of weekDates) {
        const dk = dateKey(d);
        const entries = entryMap[profileId]?.[dk] || [];
        for (const e of entries) {
          const h = e.totalHours ?? computeHours(e.clockIn, e.clockOut, e.breakMinutes);
          if (h != null) sum += h;
        }
      }
      return sum;
    },
    [entryMap, weekDates]
  );

  // Grand total
  const grandTotal = useMemo(() => {
    return Object.values(dayTotals).reduce((a, b) => a + b, 0);
  }, [dayTotals]);

  // Week navigation
  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const thisWeek = () => setWeekStart(getMonday(new Date()));

  // Week label
  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${formatDateSub(start)} - ${formatDateSub(end)}`;
  }, [weekDates]);

  // Cell click: open first entry for editing
  const handleCellClick = (profileId: string, dk: string) => {
    const entries = entryMap[profileId]?.[dk];
    if (entries && entries.length > 0) {
      openEditModal(entries[0]);
    }
  };

  // Open edit modal
  const openEditModal = (entry: TimeEntry) => {
    setEditEntry(entry);
    setEditForm({
      clockIn: toLocalDatetimeValue(entry.clockIn),
      clockOut: entry.clockOut ? toLocalDatetimeValue(entry.clockOut) : "",
      breakMinutes: String(entry.breakMinutes),
      notes: entry.notes || "",
      status: entry.status,
    });
  };

  // Reset add form
  const resetAddForm = () => {
    setAddForm({
      profileId: profiles.length > 0 ? "" : "",
      date: "",
      clockIn: "",
      clockOut: "",
      breakMinutes: "0",
      notes: "",
    });
  };

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------

  const handleAdd = async () => {
    if (!addForm.profileId || !addForm.date || !addForm.clockIn) {
      toast.error("Employee, date, and clock in are required");
      return;
    }

    setSaving(true);
    try {
      const clockInDate = new Date(`${addForm.date}T${addForm.clockIn}`);
      const clockOutDate = addForm.clockOut
        ? new Date(`${addForm.date}T${addForm.clockOut}`)
        : null;

      const totalHours = clockOutDate
        ? computeHours(
            clockInDate.toISOString(),
            clockOutDate.toISOString(),
            parseInt(addForm.breakMinutes) || 0
          )
        : null;

      const res = await fetch("/api/timekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: addForm.profileId,
          date: new Date(addForm.date).toISOString(),
          clockIn: clockInDate.toISOString(),
          clockOut: clockOutDate?.toISOString() || null,
          breakMinutes: parseInt(addForm.breakMinutes) || 0,
          totalHours,
          notes: addForm.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create entry");
      }

      toast.success("Time entry added");
      setAddOpen(false);
      resetAddForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editEntry) return;

    setSaving(true);
    try {
      const clockOutDate = editForm.clockOut
        ? new Date(editForm.clockOut)
        : null;
      const clockInDate = new Date(editForm.clockIn);

      const totalHours = clockOutDate
        ? computeHours(
            clockInDate.toISOString(),
            clockOutDate.toISOString(),
            parseInt(editForm.breakMinutes) || 0
          )
        : null;

      const res = await fetch(`/api/timekeeping/${editEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockIn: clockInDate.toISOString(),
          clockOut: clockOutDate?.toISOString() || null,
          breakMinutes: parseInt(editForm.breakMinutes) || 0,
          totalHours,
          notes: editForm.notes || null,
          status: editForm.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update entry");
      }

      toast.success("Time entry updated");
      setEditEntry(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/timekeeping/${deleteEntry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete entry");
      }

      toast.success("Time entry deleted");
      setDeleteEntry(null);
      setEditEntry(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveAll = async () => {
    const pendingEntries = timeEntries.filter(
      (e) => e.status === "PENDING"
    );
    if (pendingEntries.length === 0) {
      toast.info("No pending entries to approve");
      return;
    }

    setApproving(true);
    try {
      const results = await Promise.all(
        pendingEntries.map((entry) =>
          fetch(`/api/timekeeping/${entry.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "APPROVED" }),
          })
        )
      );

      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast.error(`Failed to approve ${failed} entries`);
      } else {
        toast.success(`Approved ${pendingEntries.length} entries`);
      }

      router.refresh();
    } catch (err) {
      toast.error("Failed to approve entries");
    } finally {
      setApproving(false);
    }
  };

  const handleFlag = async (entry: TimeEntry) => {
    try {
      const res = await fetch(`/api/timekeeping/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FLAGGED" }),
      });

      if (!res.ok) throw new Error("Failed to flag entry");

      toast.success("Entry flagged for review");
      setEditEntry(null);
      router.refresh();
    } catch {
      toast.error("Failed to flag entry");
    }
  };

  // Pending count
  const pendingCount = timeEntries.filter((e) => e.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timekeeping"
        action={
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApproveAll}
                loading={approving}
              >
                <CheckCircleIcon className="w-4 h-4" />
                Approve All Pending ({pendingCount})
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                resetAddForm();
                setAddOpen(true);
              }}
            >
              <PlusIcon className="w-4 h-4" />
              Add Time Entry
            </Button>
          </div>
        }
      />

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prevWeek}>
            &larr; Prev
          </Button>
          <Button variant="ghost" size="sm" onClick={thisWeek}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={nextWeek}>
            Next &rarr;
          </Button>
        </div>
        <span className="text-sm font-medium text-fg-secondary">{weekLabel}</span>
      </div>

      {/* Timesheet Table */}
      {displayProfiles.length === 0 ? (
        <EmptyState
          icon={<ClockIcon />}
          message="No time entries"
          description="Add time entries for employees to see them on the timesheet."
          actionLabel="Add Time Entry"
          onAction={() => {
            resetAddForm();
            setAddOpen(true);
          }}
        />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left py-3 px-4 font-semibold text-fg sticky left-0 bg-card z-10 min-w-[200px]">
                    Employee
                  </th>
                  {weekDates.map((d) => (
                    <th
                      key={dateKey(d)}
                      className="text-center py-3 px-3 font-medium min-w-[100px]"
                    >
                      <div className="text-fg">{formatDayHeader(d)}</div>
                      <div className="text-xs text-fg-muted font-normal">
                        {formatDateSub(d)}
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 font-semibold text-fg min-w-[80px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-edge last:border-0 hover:bg-hover transition-colors"
                  >
                    <td className="py-3 px-4 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={profile.user.name || profile.user.email}
                          image={profile.user.image}
                          profileColor={profile.user.profileColor}
                          profileEmoji={profile.user.profileEmoji}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-fg truncate">
                            {profile.user.name || profile.user.email}
                          </div>
                          <div className="text-xs text-fg-muted truncate">
                            {profile.jobTitle}
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((d) => {
                      const dk = dateKey(d);
                      const entries = entryMap[profile.id]?.[dk] || [];
                      const hasEntries = entries.length > 0;

                      let cellHours = 0;
                      let primaryStatus: string | null = null;
                      for (const e of entries) {
                        const h =
                          e.totalHours ??
                          computeHours(e.clockIn, e.clockOut, e.breakMinutes);
                        if (h != null) cellHours += h;
                        // Pick worst status for display
                        if (
                          e.status === "FLAGGED" ||
                          (!primaryStatus && e.status !== "APPROVED")
                        ) {
                          primaryStatus = e.status;
                        } else if (!primaryStatus) {
                          primaryStatus = e.status;
                        }
                      }

                      return (
                        <td
                          key={dk}
                          className={`text-center py-3 px-3 ${
                            hasEntries
                              ? "cursor-pointer hover:bg-elevated transition-colors"
                              : ""
                          }`}
                          onClick={() =>
                            hasEntries && handleCellClick(profile.id, dk)
                          }
                        >
                          {hasEntries ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-fg">
                                {formatHours(cellHours)}h
                              </div>
                              {primaryStatus && (
                                <Badge
                                  variant={
                                    STATUS_BADGE[primaryStatus] || "warning"
                                  }
                                >
                                  {primaryStatus}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-fg-muted">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-4">
                      <span className="text-sm font-semibold text-fg">
                        {formatHours(employeeWeekTotal(profile.id))}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-edge-strong bg-elevated">
                  <td className="py-3 px-4 font-semibold text-fg sticky left-0 bg-elevated z-10">
                    Daily Total
                  </td>
                  {weekDates.map((d) => {
                    const dk = dateKey(d);
                    return (
                      <td
                        key={dk}
                        className="text-center py-3 px-3 font-semibold text-fg"
                      >
                        {dayTotals[dk] > 0
                          ? `${formatHours(dayTotals[dk])}h`
                          : "-"}
                      </td>
                    );
                  })}
                  <td className="text-center py-3 px-4 font-bold text-fg">
                    {formatHours(grandTotal)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Add Time Entry Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Time Entry"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Employee" required htmlFor="add-profile">
            <select
              id="add-profile"
              value={addForm.profileId}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, profileId: e.target.value }))
              }
              className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select employee...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name || p.user.email} - {p.jobTitle}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Date" required htmlFor="add-date">
            <input
              id="add-date"
              type="date"
              value={addForm.date}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, date: e.target.value }))
              }
              className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Clock In" required htmlFor="add-clockin">
              <input
                id="add-clockin"
                type="time"
                value={addForm.clockIn}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, clockIn: e.target.value }))
                }
                className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </FormField>
            <FormField label="Clock Out" htmlFor="add-clockout">
              <input
                id="add-clockout"
                type="time"
                value={addForm.clockOut}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, clockOut: e.target.value }))
                }
                className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </FormField>
          </div>

          <FormField label="Break (minutes)" htmlFor="add-break">
            <input
              id="add-break"
              type="number"
              min="0"
              value={addForm.breakMinutes}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, breakMinutes: e.target.value }))
              }
              className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>

          <FormField label="Notes" htmlFor="add-notes">
            <textarea
              id="add-notes"
              value={addForm.notes}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setAddOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Add Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Time Entry Modal */}
      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Edit Time Entry"
        size="md"
      >
        {editEntry && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-edge">
              <UserAvatar
                name={editEntry.profile.user.name || ""}
                image={editEntry.profile.user.image}
                profileColor={editEntry.profile.user.profileColor}
                profileEmoji={editEntry.profile.user.profileEmoji}
                size="sm"
              />
              <div>
                <div className="text-sm font-medium text-fg">
                  {editEntry.profile.user.name || editEntry.profile.user.email}
                </div>
                <div className="text-xs text-fg-muted">
                  {new Date(editEntry.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Clock In" required htmlFor="edit-clockin">
                <input
                  id="edit-clockin"
                  type="datetime-local"
                  value={editForm.clockIn}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, clockIn: e.target.value }))
                  }
                  className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </FormField>
              <FormField label="Clock Out" htmlFor="edit-clockout">
                <input
                  id="edit-clockout"
                  type="datetime-local"
                  value={editForm.clockOut}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, clockOut: e.target.value }))
                  }
                  className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </FormField>
            </div>

            <FormField label="Break (minutes)" htmlFor="edit-break">
              <input
                id="edit-break"
                type="number"
                min="0"
                value={editForm.breakMinutes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, breakMinutes: e.target.value }))
                }
                className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </FormField>

            <FormField label="Notes" htmlFor="edit-notes">
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </FormField>

            <FormField label="Status" htmlFor="edit-status">
              <select
                id="edit-status"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, status: e.target.value }))
                }
                className="w-full rounded-lg border border-edge bg-input-bg text-fg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="FLAGGED">Flagged</option>
              </select>
            </FormField>

            {/* Entry details: clock in/out times */}
            {editEntry.clockIn && (
              <div className="text-xs text-fg-muted pt-1">
                Original: {formatTime(editEntry.clockIn)}
                {editEntry.clockOut && ` - ${formatTime(editEntry.clockOut)}`}
                {editEntry.totalHours != null &&
                  ` (${formatHours(editEntry.totalHours)}h)`}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteEntry(editEntry)}
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </Button>
                {editEntry.status !== "FLAGGED" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlag(editEntry)}
                  >
                    Flag
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setEditEntry(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleEdit} loading={saving}>
                  <PencilIcon className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message={
          deleteEntry
            ? `Are you sure you want to delete this time entry for ${
                deleteEntry.profile.user.name || "this employee"
              } on ${new Date(deleteEntry.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import StatusBadge from "@/components/StatusBadge";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  amountPaid: number | null;
  notes: string | null;
  service: { name: string; color: string | null };
  provider: { staffUser: { name: string } };
  customer: { name: string; email: string; phone: string | null };
}

export default function HistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const fetchAppointments = useCallback(async (reset = false) => {
    const newOffset = reset ? 0 : offset;
    const params = new URLSearchParams({ limit: String(limit), offset: String(newOffset) });
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/appointments?${params}`);
    const data = await res.json();
    const items = data.appointments || [];

    if (reset) {
      setAppointments(items);
      setOffset(limit);
    } else {
      setAppointments((prev) => [...prev, ...items]);
      setOffset(newOffset + limit);
    }
    setHasMore(items.length === limit);
    setLoading(false);
  }, [offset, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments(true);
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-skeleton rounded w-48" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Appointment History</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-edge-strong"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-card rounded-xl border border-edge shadow-sm p-12 text-center">
          <p className="text-fg-muted">No appointments found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-edge shadow-sm divide-y divide-divider">
          {appointments.map((apt) => {
            const start = new Date(apt.startTime);
            const end = new Date(apt.endTime);
            return (
              <div key={apt.id} className="px-5 py-4 flex items-center gap-4">
                <div
                  className="w-1 h-12 rounded-full shrink-0"
                  style={{ backgroundColor: apt.service.color || "#8b5cf6" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-fg">{apt.customer.name}</span>
                    <StatusBadge status={apt.status} />
                    {apt.source === "manual" && (
                      <span className="text-xs bg-elevated text-fg-muted rounded-full px-2 py-0.5">Walk-in</span>
                    )}
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {apt.service.name} with {apt.provider.staffUser.name}
                  </p>
                  {apt.notes && (
                    <p className="text-xs text-fg-dim mt-0.5 truncate">{apt.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm text-fg-secondary">
                    {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  <div className="text-xs text-fg-dim">
                    {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {" - "}
                    {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                  {apt.amountPaid != null && (
                    <div className="text-xs text-status-green-fg font-medium">${apt.amountPaid.toFixed(2)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchAppointments(false)}
            className="px-4 py-2 text-sm text-accent hover:underline"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

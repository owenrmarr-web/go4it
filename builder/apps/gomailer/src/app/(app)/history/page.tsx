"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/Badge";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { ListIcon } from "@/components/Icons";

interface SendLog {
  id: string;
  subscriberEmail: string;
  subscriberName: string | null;
  status: string;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  campaign: { name: string };
}

const STATUS_OPTIONS = ["ALL", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "FAILED"];

export default function HistoryPage() {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    fetch(`/api/send-logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const statusVariant = (status: string): "success" | "info" | "error" | "neutral" => {
    const map: Record<string, "success" | "info" | "error" | "neutral"> = {
      DELIVERED: "success",
      OPENED: "info",
      CLICKED: "info",
      BOUNCED: "error",
      FAILED: "error",
    };
    return map[status] || "neutral";
  };

  if (loading) {
    return <div className="text-fg-muted p-8">Loading send history...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Send History" />

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by email or campaign..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All Statuses" : s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="To"
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<ListIcon />}
          message="No send history found"
          actionLabel="View Campaigns"
          onAction={() => (window.location.href = "/campaigns")}
        />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left p-3 text-fg-muted font-medium">Campaign</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Email</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Status</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Sent</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Opened</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-edge">
                    <td className="p-3 text-fg font-medium">{log.campaign.name}</td>
                    <td className="p-3 text-fg-secondary">{log.subscriberEmail}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="p-3 text-fg-muted">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-fg-muted">
                      {log.openedAt ? new Date(log.openedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-fg-muted">
                      {log.clickedAt ? new Date(log.clickedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

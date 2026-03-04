"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { InboxIcon } from "@/components/Icons";

type SubmissionStatus = "COMPLETE" | "REVIEWED" | "FLAGGED";

interface Submission {
  id: string;
  formTitle: string;
  formId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  status: SubmissionStatus;
  createdAt: string;
}

interface FormOption {
  id: string;
  title: string;
}

const STATUS_TABS: { key: "ALL" | SubmissionStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "COMPLETE", label: "Complete" },
  { key: "REVIEWED", label: "Reviewed" },
  { key: "FLAGGED", label: "Flagged" },
];

const STATUS_BADGE: Record<SubmissionStatus, "success" | "info" | "error"> = {
  COMPLETE: "success",
  REVIEWED: "info",
  FLAGGED: "error",
};

export default function SubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SubmissionStatus>("ALL");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status") as "ALL" | SubmissionStatus;
    if (s && ["ALL", "COMPLETE", "REVIEWED", "FLAGGED"].includes(s)) {
      setStatusFilter(s);
    }
  }, []);
  const [formFilter, setFormFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (formFilter !== "ALL") params.set("formId", formFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/submissions?${params}`);
      if (!res.ok) throw new Error("Failed");
      setSubmissions(await res.json());
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, formFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((data: { id: string; title: string }[]) =>
        setForms(data.map((f) => ({ id: f.id, title: f.title })))
      )
      .catch(() => {});
  }, []);

  const filtered = search
    ? submissions.filter(
        (s) =>
          s.respondentName?.toLowerCase().includes(search.toLowerCase()) ||
          s.respondentEmail?.toLowerCase().includes(search.toLowerCase())
      )
    : submissions;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Submissions" />

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-edge mb-4 mt-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              statusFilter === t.key
                ? "text-accent-fg border-b-2 border-accent-fg"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
            {t.key !== "ALL" && (
              <span className="ml-1.5 text-xs text-fg-dim">
                ({submissions.filter((s) => s.status === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        </div>
        <select
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none"
        >
          <option value="ALL">All Forms</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-fg-muted">Loading submissions...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          message={search || statusFilter !== "ALL" || formFilter !== "ALL" ? "No submissions match your filters" : "No submissions yet"}
        />
      ) : (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-elevated">
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Respondent</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium hidden lg:table-cell">Form</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-edge last:border-0 hover:bg-hover cursor-pointer transition-colors"
                  onClick={() => router.push(`/submissions/${sub.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-fg">
                    {sub.respondentName || <span className="text-fg-muted italic">Anonymous</span>}
                  </td>
                  <td className="px-4 py-3 text-fg-muted hidden md:table-cell">
                    {sub.respondentEmail || "—"}
                  </td>
                  <td className="px-4 py-3 text-fg-secondary hidden lg:table-cell truncate max-w-xs">
                    {sub.formTitle}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[sub.status] ?? "neutral"}>
                      {sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-fg-muted">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

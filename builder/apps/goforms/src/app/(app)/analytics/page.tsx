"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Badge from "@/components/Badge";
import Link from "next/link";

interface FormOption {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface AnalyticsSummary {
  type: "summary";
  totalForms: number;
  activeForms: number;
  totalSubmissions: number;
  submissionsByDay: { date: string; count: number }[];
  formStats: {
    id: string;
    title: string;
    type: string;
    status: string;
    submissionCount: number;
    lastSubmission: string | null;
  }[];
}

interface FormAnalytics {
  type: "form";
  form: { id: string; title: string; type: string; status: string };
  totalSubmissions: number;
  submissionsByDay: { date: string; count: number }[];
  fieldAnalytics: FieldAnalytic[];
}

interface FieldAnalytic {
  fieldId: string;
  label: string;
  fieldType: string;
  totalResponses: number;
  min?: number;
  max?: number;
  avg?: number;
  avgRating?: number;
  distribution?: Record<string, number>;
  optionCounts?: Record<string, number>;
  trueCount?: number;
  falseCount?: number;
}

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Text", TEXTAREA: "Paragraph", NUMBER: "Number", EMAIL: "Email",
  DATE: "Date", SELECT: "Dropdown", MULTI_SELECT: "Multi-select",
  CHECKBOX: "Checkbox", RADIO: "Radio", RATING: "Rating",
};

const FORM_TYPE_BADGE: Record<string, "neutral" | "info" | "warning"> = {
  FORM: "neutral", SURVEY: "info", CHECKLIST: "warning",
};
const FORM_STATUS_BADGE: Record<string, "neutral" | "success" | "warning"> = {
  DRAFT: "neutral", ACTIVE: "success", CLOSED: "warning", ARCHIVED: "neutral",
};

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const nonZero = data.filter((d) => d.count > 0);

  if (nonZero.length === 0) {
    return <p className="text-sm text-fg-muted py-4 text-center">No data in the last 30 days</p>;
  }

  return (
    <div className="flex items-end gap-0.5 h-24">
      {data.map((d) => {
        const h = d.count > 0 ? Math.max((d.count / max) * 100, 8) : 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${d.date}: ${d.count}`}
          >
            <div
              className="w-full rounded-t bg-accent min-h-0 transition-all"
              style={{ height: `${h}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function FieldCard({ data }: { data: FieldAnalytic }) {
  return (
    <div className="bg-card border border-edge rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-medium text-fg">{data.label}</h4>
        <Badge variant="neutral">{TYPE_LABELS[data.fieldType] ?? data.fieldType}</Badge>
        <span className="ml-auto text-sm text-fg-muted">{data.totalResponses} responses</span>
      </div>

      {data.fieldType === "NUMBER" && data.totalResponses > 0 && (
        <div className="flex gap-8">
          {(["Min", "Max", "Avg"] as const).map((k) => {
            const val = k === "Min" ? data.min : k === "Max" ? data.max : data.avg;
            return (
              <div key={k} className="text-center">
                <div className="text-2xl font-bold text-fg">{typeof val === "number" ? val.toFixed(1) : "—"}</div>
                <div className="text-xs text-fg-muted">{k}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.fieldType === "RATING" && (
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-fg">{data.avgRating?.toFixed(1) ?? "—"}</span>
            <span className="text-fg-muted text-sm">/ 5 avg</span>
          </div>
          {data.distribution && (
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = data.distribution![String(star)] ?? 0;
                const total = data.totalResponses || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-fg-muted w-8">{star} ★</span>
                    <div className="flex-1 h-4 bg-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-status-amber rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-fg-muted w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(data.fieldType === "SELECT" || data.fieldType === "RADIO" || data.fieldType === "MULTI_SELECT") && data.optionCounts && (
        <div className="space-y-2">
          {Object.entries(data.optionCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([opt, count]) => {
              const max = Math.max(...Object.values(data.optionCounts!), 1);
              const pct = (count / max) * 100;
              const totalPct = data.totalResponses > 0 ? Math.round((count / data.totalResponses) * 100) : 0;
              return (
                <div key={opt} className="flex items-center gap-3">
                  <span className="text-sm text-fg-secondary w-36 truncate" title={opt}>{opt}</span>
                  <div className="flex-1 h-5 bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-fg-muted w-10 text-right">{count} <span className="text-fg-dim">({totalPct}%)</span></span>
                </div>
              );
            })}
        </div>
      )}

      {data.fieldType === "CHECKBOX" && (
        <div className="flex gap-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-status-green-fg">{data.trueCount ?? 0}</div>
            <div className="text-xs text-fg-muted">Yes / Checked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-fg-muted">{data.falseCount ?? 0}</div>
            <div className="text-xs text-fg-muted">No / Unchecked</div>
          </div>
        </div>
      )}

      {["TEXT", "TEXTAREA", "EMAIL", "DATE"].includes(data.fieldType) && (
        <p className="text-sm text-fg-muted">{data.totalResponses} text {data.fieldType === "DATE" ? "date" : ""} responses collected</p>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [forms, setForms] = useState<FormOption[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [formAnalytics, setFormAnalytics] = useState<FormAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((data) => setForms(data))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedFormId
        ? `/api/analytics?formId=${selectedFormId}`
        : "/api/analytics";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.type === "form") {
        setFormAnalytics(data);
        setSummary(null);
      } else {
        setSummary(data);
        setFormAnalytics(null);
      }
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedFormId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">Analytics</h1>
          <p className="text-fg-muted text-sm mt-1">Response insights and submission trends</p>
        </div>
        <select
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none min-w-48"
        >
          <option value="">All Forms (Summary)</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-fg-muted">Loading analytics...</div>
      ) : formAnalytics ? (
        // Per-form view
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-fg">{formAnalytics.form.title}</h2>
            <Badge variant={FORM_TYPE_BADGE[formAnalytics.form.type] ?? "neutral"}>{formAnalytics.form.type}</Badge>
            <Badge variant={FORM_STATUS_BADGE[formAnalytics.form.status] ?? "neutral"}>{formAnalytics.form.status}</Badge>
            <Link href={`/forms/${formAnalytics.form.id}`} className="text-sm text-accent-fg hover:underline ml-auto">
              View form →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-edge rounded-xl p-5">
              <div className="text-sm text-fg-muted mb-1">Total Submissions</div>
              <div className="text-3xl font-bold text-fg">{formAnalytics.totalSubmissions}</div>
            </div>
            <div className="bg-card border border-edge rounded-xl p-5">
              <div className="text-sm text-fg-muted mb-1">Fields</div>
              <div className="text-3xl font-bold text-fg">{formAnalytics.fieldAnalytics.length}</div>
            </div>
          </div>

          <div className="bg-card border border-edge rounded-xl p-5">
            <h3 className="font-semibold text-fg mb-1">Submissions Over Time</h3>
            <p className="text-sm text-fg-muted mb-4">Last 30 days</p>
            <BarChart data={formAnalytics.submissionsByDay} />
            <div className="flex justify-between text-xs text-fg-dim mt-1">
              <span>{formAnalytics.submissionsByDay[0]?.date}</span>
              <span>{formAnalytics.submissionsByDay[formAnalytics.submissionsByDay.length - 1]?.date}</span>
            </div>
          </div>

          {formAnalytics.fieldAnalytics.length > 0 && (
            <div>
              <h3 className="font-semibold text-fg mb-4">Per-Field Breakdown</h3>
              <div className="space-y-4">
                {formAnalytics.fieldAnalytics.map((fa) => (
                  <FieldCard key={fa.fieldId} data={fa} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : summary ? (
        // Summary view
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card border border-edge rounded-xl p-5">
              <div className="text-sm text-fg-muted mb-1">Total Forms</div>
              <div className="text-3xl font-bold text-fg">{summary.totalForms}</div>
            </div>
            <div className="bg-card border border-edge rounded-xl p-5">
              <div className="text-sm text-fg-muted mb-1">Active Forms</div>
              <div className="text-3xl font-bold text-status-green-fg">{summary.activeForms}</div>
            </div>
            <div className="bg-card border border-edge rounded-xl p-5">
              <div className="text-sm text-fg-muted mb-1">Total Submissions</div>
              <div className="text-3xl font-bold text-fg">{summary.totalSubmissions}</div>
            </div>
          </div>

          <div className="bg-card border border-edge rounded-xl p-5">
            <h3 className="font-semibold text-fg mb-1">Submission Trend</h3>
            <p className="text-sm text-fg-muted mb-4">All forms · last 30 days</p>
            <BarChart data={summary.submissionsByDay} />
            <div className="flex justify-between text-xs text-fg-dim mt-1">
              <span>{summary.submissionsByDay[0]?.date}</span>
              <span>{summary.submissionsByDay[summary.submissionsByDay.length - 1]?.date}</span>
            </div>
          </div>

          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-edge">
              <h3 className="font-semibold text-fg">Submissions per Form</h3>
            </div>
            {summary.formStats.length === 0 ? (
              <p className="p-6 text-center text-fg-muted">No forms yet</p>
            ) : (
              <div className="divide-y divide-edge">
                {summary.formStats.map((f) => {
                  const maxCount = Math.max(...summary.formStats.map((x) => x.submissionCount), 1);
                  return (
                    <div key={f.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="w-36 min-w-0">
                        <Link href={`/forms/${f.id}`} className="text-sm font-medium text-fg hover:text-accent-fg truncate block">{f.title}</Link>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant={FORM_TYPE_BADGE[f.type] ?? "neutral"}>{f.type}</Badge>
                          <Badge variant={FORM_STATUS_BADGE[f.status] ?? "neutral"}>{f.status}</Badge>
                        </div>
                      </div>
                      <div className="flex-1 h-5 bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(f.submissionCount / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-fg w-8 text-right">{f.submissionCount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

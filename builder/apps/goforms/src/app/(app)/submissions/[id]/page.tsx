"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import { CheckCircleIcon, BellIcon, TrashIcon } from "@/components/Icons";

type SubmissionStatus = "COMPLETE" | "REVIEWED" | "FLAGGED";

interface Response {
  id: string;
  fieldLabel: string;
  fieldType: string;
  value: string;
}

interface SubmissionDetail {
  id: string;
  formId: string;
  formTitle: string;
  formType: string;
  respondentName: string | null;
  respondentEmail: string | null;
  status: SubmissionStatus;
  notes: string | null;
  createdAt: string;
  responses: Response[];
}

const STATUS_BADGE: Record<SubmissionStatus, "success" | "info" | "error"> = {
  COMPLETE: "success", REVIEWED: "info", FLAGGED: "error",
};

const FIELD_TYPE_BADGE: Record<string, "neutral" | "info" | "warning" | "success"> = {
  TEXT: "neutral", TEXTAREA: "neutral", NUMBER: "info", EMAIL: "info",
  DATE: "info", SELECT: "warning", MULTI_SELECT: "warning", RADIO: "warning",
  CHECKBOX: "success", RATING: "warning",
};

function renderValue(type: string, value: string) {
  if (type === "CHECKBOX") return value === "true" ? "✓ Yes" : "✗ No";
  if (type === "RATING") return "★".repeat(Number(value)) + "☆".repeat(5 - Number(value));
  if (type === "MULTI_SELECT") {
    try { return JSON.parse(value).join(", "); } catch { return value; }
  }
  return value || "—";
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setSubmission(data);
      setNotes(data.notes ?? "");
    } catch {
      toast.error("Submission not found");
      router.push("/submissions");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (status: SubmissionStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Marked as ${status.toLowerCase()}`);
      load();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Submission deleted");
      router.push("/submissions");
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-6 text-fg-muted">Loading submission...</div>;
  if (!submission) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/submissions" className="text-fg-muted hover:text-fg text-sm mt-1">← Back</Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-fg">
              {submission.respondentName || "Anonymous Submission"}
            </h1>
            <Badge variant={STATUS_BADGE[submission.status]}>
              {submission.status.charAt(0) + submission.status.slice(1).toLowerCase()}
            </Badge>
          </div>
          <p className="text-sm text-fg-muted">
            {submission.respondentEmail && <span className="mr-3">{submission.respondentEmail}</span>}
            <Link href={`/forms/${submission.formId}`} className="text-accent-fg hover:underline">
              {submission.formTitle}
            </Link>
            <span className="ml-3 text-fg-dim">
              {new Date(submission.createdAt).toLocaleString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="p-2 rounded-lg hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors"
          title="Delete"
        ><TrashIcon /></button>
      </div>

      {/* Status actions */}
      <div className="bg-card border border-edge rounded-xl p-4 mb-5 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-fg-secondary mr-2">Mark as:</span>
        <Button
          variant={submission.status === "REVIEWED" ? "primary" : "secondary"}
          onClick={() => updateStatus("REVIEWED")}
          disabled={updatingStatus || submission.status === "REVIEWED"}
        >
          <span className="flex items-center gap-2">
            <CheckCircleIcon /> Reviewed
          </span>
        </Button>
        {submission.status !== "FLAGGED" ? (
          <Button
            variant="secondary"
            onClick={() => updateStatus("FLAGGED")}
            disabled={updatingStatus}
          >
            <span className="flex items-center gap-2 text-status-red-fg">
              <BellIcon /> Flag
            </span>
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => updateStatus("COMPLETE")}
            disabled={updatingStatus}
          >
            Unflag
          </Button>
        )}
        {submission.status === "FLAGGED" && (
          <Button
            variant="secondary"
            onClick={() => updateStatus("REVIEWED")}
            disabled={updatingStatus}
          >
            <span className="flex items-center gap-2">
              <CheckCircleIcon /> Mark Reviewed
            </span>
          </Button>
        )}
      </div>

      {/* Responses */}
      <div className="bg-card border border-edge rounded-xl divide-y divide-edge mb-5">
        {submission.responses.length === 0 ? (
          <div className="p-6 text-center text-fg-muted">No field responses recorded.</div>
        ) : (
          submission.responses.map((resp) => (
            <div key={resp.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-fg-secondary">{resp.fieldLabel}</span>
                <Badge variant={FIELD_TYPE_BADGE[resp.fieldType] ?? "neutral"} >
                  {resp.fieldType.toLowerCase().replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-fg font-medium">
                {renderValue(resp.fieldType, resp.value)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Internal notes */}
      <div className="bg-card border border-edge rounded-xl p-5">
        <h3 className="font-semibold text-fg mb-3">Internal Notes</h3>
        <FormField label="Notes (visible only to you)">
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this submission..."
          />
        </FormField>
        <div className="mt-3">
          <Button variant="secondary" onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? This cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
        destructive
        loading={deleting}
      />
    </div>
  );
}

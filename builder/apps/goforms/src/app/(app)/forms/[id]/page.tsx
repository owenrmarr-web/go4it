"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import {
  PencilIcon, TrashIcon, PlusIcon,
  ChartBarIcon, InboxIcon, DocumentIcon,
} from "@/components/Icons";

type FieldType =
  | "TEXT" | "TEXTAREA" | "NUMBER" | "EMAIL" | "DATE"
  | "SELECT" | "MULTI_SELECT" | "CHECKBOX" | "RADIO" | "RATING";

type FormStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

interface Field {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  order: number;
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: FormStatus;
  slug: string;
  submissionCount: number;
  allowMultiple: boolean;
  requireName: boolean;
  requireEmail: boolean;
  closedMessage: string | null;
  fields: Field[];
}

interface SubmissionRow {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  status: string;
  createdAt: string;
}

interface AnalyticsData {
  type: "form";
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

const FIELD_TYPE_BADGE: Record<string, "neutral" | "info" | "warning" | "success"> = {
  TEXT: "neutral", TEXTAREA: "neutral", NUMBER: "info", EMAIL: "info",
  DATE: "info", SELECT: "warning", MULTI_SELECT: "warning", RADIO: "warning",
  CHECKBOX: "success", RATING: "warning",
};

const STATUS_BADGE: Record<FormStatus, "neutral" | "success" | "warning"> = {
  DRAFT: "neutral", ACTIVE: "success", CLOSED: "warning", ARCHIVED: "neutral",
};

const TYPE_BADGE: Record<string, "neutral" | "info" | "warning"> = {
  FORM: "neutral", SURVEY: "info", CHECKLIST: "warning",
};

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm";

const OPTION_TYPES = ["SELECT", "MULTI_SELECT", "RADIO"];

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"fields" | "submissions" | "analytics">("fields");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Field editor modal
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editField, setEditField] = useState<Field | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("TEXT");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldOptions, setFieldOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [savingField, setSavingField] = useState(false);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<Field | null>(null);

  // Status actions
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedMessage, setClosedMessage] = useState("");
  const [showStatusConfirm, setShowStatusConfirm] = useState<{ to: FormStatus; label: string } | null>(null);
  const [applyingStatus, setApplyingStatus] = useState(false);

  // Share modal
  const [showShare, setShowShare] = useState(false);

  // Edit form modal
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRequireName, setEditRequireName] = useState(true);
  const [editRequireEmail, setEditRequireEmail] = useState(true);
  const [editAllowMultiple, setEditAllowMultiple] = useState(false);
  const [editClosedMsg, setEditClosedMsg] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  const loadForm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${id}`);
      if (!res.ok) throw new Error("Not found");
      setForm(await res.json());
    } catch {
      toast.error("Failed to load form");
      router.push("/forms");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadForm(); }, [loadForm]);

  useEffect(() => {
    if (tab === "submissions" && form) {
      setLoadingSubs(true);
      fetch(`/api/submissions?formId=${id}`)
        .then((r) => r.json())
        .then(setSubmissions)
        .catch(() => toast.error("Failed to load submissions"))
        .finally(() => setLoadingSubs(false));
    }
    if (tab === "analytics" && form) {
      setLoadingAnalytics(true);
      fetch(`/api/analytics?formId=${id}`)
        .then((r) => r.json())
        .then(setAnalytics)
        .catch(() => toast.error("Failed to load analytics"))
        .finally(() => setLoadingAnalytics(false));
    }
  }, [tab, form, id]);

  const openAddField = () => {
    setEditField(null);
    setFieldLabel("");
    setFieldType("TEXT");
    setFieldRequired(false);
    setFieldPlaceholder("");
    setFieldOptions(["Option 1", "Option 2"]);
    setShowFieldModal(true);
  };

  const openEditField = (f: Field) => {
    setEditField(f);
    setFieldLabel(f.label);
    setFieldType(f.type);
    setFieldRequired(f.required);
    setFieldPlaceholder(f.placeholder ?? "");
    setFieldOptions(f.options?.length ? f.options : ["Option 1", "Option 2"]);
    setShowFieldModal(true);
  };

  const saveField = async () => {
    if (!fieldLabel.trim()) { toast.error("Label is required"); return; }
    setSavingField(true);
    try {
      const payload = {
        label: fieldLabel.trim(),
        type: fieldType,
        required: fieldRequired,
        placeholder: fieldPlaceholder.trim() || null,
        options: OPTION_TYPES.includes(fieldType) ? fieldOptions.filter(Boolean) : null,
      };
      const url = editField
        ? `/api/forms/${id}/fields/${editField.id}`
        : `/api/forms/${id}/fields`;
      const res = await fetch(url, {
        method: editField ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save field");
      toast.success(editField ? "Field updated" : "Field added");
      setShowFieldModal(false);
      loadForm();
    } catch {
      toast.error("Failed to save field");
    } finally {
      setSavingField(false);
    }
  };

  const deleteField = async () => {
    if (!deleteFieldTarget) return;
    try {
      await fetch(`/api/forms/${id}/fields/${deleteFieldTarget.id}`, { method: "DELETE" });
      toast.success("Field deleted");
      setDeleteFieldTarget(null);
      loadForm();
    } catch {
      toast.error("Failed to delete field");
    }
  };

  const moveField = async (fieldId: string, direction: "up" | "down") => {
    try {
      await fetch(`/api/forms/${id}/fields/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      loadForm();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const applyStatus = async (to: FormStatus, extraData?: object) => {
    setApplyingStatus(true);
    try {
      const res = await fetch(`/api/forms/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to, ...extraData }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Form ${to.toLowerCase()}`);
      setShowStatusConfirm(null);
      setShowCloseModal(false);
      loadForm();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setApplyingStatus(false);
    }
  };

  const openEditForm = () => {
    if (!form) return;
    setEditTitle(form.title);
    setEditDesc(form.description ?? "");
    setEditRequireName(form.requireName);
    setEditRequireEmail(form.requireEmail);
    setEditAllowMultiple(form.allowMultiple);
    setEditClosedMsg(form.closedMessage ?? "");
    setShowEditForm(true);
  };

  const saveFormEdit = async () => {
    setSavingForm(true);
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          requireName: editRequireName,
          requireEmail: editRequireEmail,
          allowMultiple: editAllowMultiple,
          closedMessage: editClosedMsg.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Form saved");
      setShowEditForm(false);
      loadForm();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingForm(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-fg-muted">Loading form...</div>;
  }
  if (!form) return null;

  const statusBadge = form.status;
  const canEditFields = form.status === "DRAFT" || form.status === "ACTIVE";
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/f/${form.slug}`
    : `/f/${form.slug}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/forms" className="text-fg-muted hover:text-fg text-sm mt-1">← Back</Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-fg">{form.title}</h1>
            <Badge variant={TYPE_BADGE[form.type] ?? "neutral"}>{form.type}</Badge>
            <Badge variant={STATUS_BADGE[statusBadge]}>{statusBadge.charAt(0) + statusBadge.slice(1).toLowerCase()}</Badge>
          </div>
          {form.description && <p className="text-fg-muted text-sm">{form.description}</p>}
          <p className="text-xs text-fg-dim mt-1">slug: {form.slug} · {form.submissionCount} submissions</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="secondary" onClick={openEditForm}>Edit</Button>
          {form.status === "DRAFT" && (
            <Button variant="primary" onClick={() => setShowStatusConfirm({ to: "ACTIVE", label: "Activate this form? It will start accepting submissions." })}>
              Activate
            </Button>
          )}
          {form.status === "ACTIVE" && (
            <>
              <Button variant="secondary" onClick={() => setShowShare(true)}>Share</Button>
              <Button variant="secondary" onClick={() => setShowCloseModal(true)}>Close</Button>
            </>
          )}
          {form.status === "CLOSED" && (
            <>
              <Button variant="secondary" onClick={() => setShowStatusConfirm({ to: "ACTIVE", label: "Reopen this form?" })}>Reopen</Button>
              <Button variant="secondary" onClick={() => setShowStatusConfirm({ to: "ARCHIVED", label: "Archive this form?" })}>Archive</Button>
            </>
          )}
          {form.status === "ARCHIVED" && (
            <Button variant="secondary" onClick={() => setShowStatusConfirm({ to: "DRAFT", label: "Restore this form to Draft?" })}>Restore</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-edge mb-6">
        {(["fields", "submissions", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "text-accent-fg border-b-2 border-accent-fg"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {t === "fields" && <DocumentIcon />}
            {t === "submissions" && <InboxIcon />}
            {t === "analytics" && <ChartBarIcon />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Fields Tab */}
      {tab === "fields" && (
        <div>
          {canEditFields && (
            <div className="flex justify-end mb-4">
              <Button variant="primary" onClick={openAddField}>
                <span className="flex items-center gap-2"><PlusIcon /> Add Field</span>
              </Button>
            </div>
          )}
          {form.fields.length === 0 ? (
            <div className="bg-card border border-edge rounded-xl p-10 text-center">
              <p className="text-fg-muted mb-4">No fields yet. Add a field to start building your form.</p>
              {canEditFields && (
                <Button variant="primary" onClick={openAddField}>Add your first field</Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {form.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="bg-card border border-edge rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveField(field.id, "up")}
                      disabled={idx === 0 || !canEditFields}
                      className="p-0.5 rounded hover:bg-hover disabled:opacity-30 text-fg-muted text-xs leading-none"
                      title="Move up"
                    >▲</button>
                    <button
                      onClick={() => moveField(field.id, "down")}
                      disabled={idx === form.fields.length - 1 || !canEditFields}
                      className="p-0.5 rounded hover:bg-hover disabled:opacity-30 text-fg-muted text-xs leading-none"
                      title="Move down"
                    >▼</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-fg text-sm">{field.label}</span>
                      {field.required && <span className="text-status-red-fg text-xs">*</span>}
                      <Badge variant={FIELD_TYPE_BADGE[field.type] ?? "neutral"}>
                        {TYPE_LABELS[field.type] ?? field.type}
                      </Badge>
                    </div>
                    {field.placeholder && (
                      <p className="text-xs text-fg-muted mt-0.5">Placeholder: {field.placeholder}</p>
                    )}
                    {field.options && field.options.length > 0 && (
                      <p className="text-xs text-fg-muted mt-0.5">
                        Options: {field.options.join(", ")}
                      </p>
                    )}
                  </div>
                  {canEditFields && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditField(field)}
                        className="p-1.5 rounded hover:bg-hover text-fg-muted hover:text-fg"
                        title="Edit"
                      ><PencilIcon /></button>
                      <button
                        onClick={() => setDeleteFieldTarget(field)}
                        className="p-1.5 rounded hover:bg-hover text-fg-muted hover:text-status-red-fg"
                        title="Delete"
                      ><TrashIcon /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {tab === "submissions" && (
        <div>
          {loadingSubs ? (
            <div className="py-12 text-center text-fg-muted">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="bg-card border border-edge rounded-xl p-10 text-center text-fg-muted">
              No submissions for this form yet.
            </div>
          ) : (
            <div className="bg-card border border-edge rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge bg-elevated">
                    <th className="text-left px-4 py-3 text-fg-muted font-medium">Respondent</th>
                    <th className="text-left px-4 py-3 text-fg-muted font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-fg-muted font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const statusVariant: Record<string, "success" | "info" | "error"> = {
                      COMPLETE: "success", REVIEWED: "info", FLAGGED: "error",
                    };
                    return (
                      <tr
                        key={sub.id}
                        className="border-b border-edge last:border-0 hover:bg-hover cursor-pointer"
                        onClick={() => router.push(`/submissions/${sub.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-fg">
                          {sub.respondentName || "Anonymous"}
                        </td>
                        <td className="px-4 py-3 text-fg-muted hidden md:table-cell">
                          {sub.respondentEmail || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[sub.status] ?? "neutral"}>
                            {sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-fg-muted">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <div>
          {loadingAnalytics ? (
            <div className="py-12 text-center text-fg-muted">Loading analytics...</div>
          ) : !analytics ? null : (
            <div className="space-y-6">
              <div className="bg-card border border-edge rounded-xl p-5">
                <h3 className="font-semibold text-fg mb-1">Submissions Over Time</h3>
                <p className="text-sm text-fg-muted mb-4">Last 30 days · {analytics.totalSubmissions} total</p>
                <SubmissionChart data={analytics.submissionsByDay} />
              </div>
              {analytics.fieldAnalytics.map((fa) => (
                <FieldAnalyticCard key={fa.fieldId} data={fa} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Field Editor Modal */}
      <Modal
        open={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        title={editField ? "Edit Field" : "Add Field"}
      >
        <div className="space-y-4">
          <FormField label="Label" required>
            <input
              className={inputClass}
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="e.g. What is your name?"
              autoFocus
            />
          </FormField>
          <FormField label="Field Type">
            <select
              className={inputClass}
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>
          {!["CHECKBOX", "RATING"].includes(fieldType) && (
            <FormField label="Placeholder">
              <input
                className={inputClass}
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder="Hint text shown inside the input"
              />
            </FormField>
          )}
          {OPTION_TYPES.includes(fieldType) && (
            <FormField label="Options">
              <div className="space-y-2">
                {fieldOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...fieldOptions];
                        next[i] = e.target.value;
                        setFieldOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                    />
                    <button
                      onClick={() => setFieldOptions(fieldOptions.filter((_, j) => j !== i))}
                      className="px-2 py-1 rounded-lg text-status-red-fg hover:bg-hover text-sm"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setFieldOptions([...fieldOptions, ""])}
                  className="text-sm text-accent-fg hover:underline flex items-center gap-1"
                >
                  <PlusIcon /> Add option
                </button>
              </div>
            </FormField>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fieldRequired}
              onChange={(e) => setFieldRequired(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-fg">Required field</span>
          </label>

          {/* Preview */}
          <div className="border border-edge rounded-lg p-4 bg-elevated">
            <p className="text-xs text-fg-muted mb-2 font-medium uppercase tracking-wide">Preview</p>
            <FieldPreview
              type={fieldType}
              label={fieldLabel || "Your label here"}
              placeholder={fieldPlaceholder}
              options={OPTION_TYPES.includes(fieldType) ? fieldOptions.filter(Boolean) : []}
              required={fieldRequired}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={saveField} disabled={savingField} className="flex-1">
              {savingField ? "Saving..." : editField ? "Save Field" : "Add Field"}
            </Button>
            <Button variant="secondary" onClick={() => setShowFieldModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Field Confirm */}
      <ConfirmDialog
        open={!!deleteFieldTarget}
        title="Delete Field"
        message={`Delete field "${deleteFieldTarget?.label}"? Any responses to this field will also be deleted. This cannot be undone.`}
        onConfirm={deleteField}
        onClose={() => setDeleteFieldTarget(null)}
        destructive
      />

      {/* Status Confirm */}
      <ConfirmDialog
        open={!!showStatusConfirm}
        title="Confirm"
        message={showStatusConfirm?.label ?? ""}
        onConfirm={() => showStatusConfirm && applyStatus(showStatusConfirm.to)}
        onClose={() => setShowStatusConfirm(null)}
        loading={applyingStatus}
      />

      {/* Close Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Close Form">
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            This form will stop accepting submissions. Respondents will see the message below.
          </p>
          <FormField label="Closed Message">
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              placeholder="This form is no longer accepting responses."
            />
          </FormField>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => applyStatus("CLOSED", { closedMessage: closedMessage || undefined })}
              disabled={applyingStatus}
              className="flex-1"
            >
              {applyingStatus ? "Closing..." : "Close Form"}
            </Button>
            <Button variant="secondary" onClick={() => setShowCloseModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal open={showShare} onClose={() => setShowShare(false)} title="Share Form">
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">Share this link with respondents to collect submissions.</p>
          <div className="flex gap-2">
            <input
              readOnly
              className={`${inputClass} flex-1`}
              value={shareUrl}
            />
            <Button
              variant="secondary"
              onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-fg-muted">Slug: <code className="bg-elevated px-1 rounded">{form.slug}</code></p>
        </div>
      </Modal>

      {/* Edit Form Modal */}
      <Modal open={showEditForm} onClose={() => setShowEditForm(false)} title="Edit Form Settings">
        <div className="space-y-4">
          <FormField label="Title" required>
            <input className={inputClass} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </FormField>
          <FormField label="Description">
            <textarea className={`${inputClass} resize-none`} rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </FormField>
          <FormField label="Closed Message">
            <input className={inputClass} value={editClosedMsg} onChange={(e) => setEditClosedMsg(e.target.value)} placeholder="Message shown when form is closed" />
          </FormField>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={editRequireName} onChange={(e) => setEditRequireName(e.target.checked)} className="w-4 h-4 accent-accent" />
              <span className="text-sm text-fg">Require name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={editRequireEmail} onChange={(e) => setEditRequireEmail(e.target.checked)} className="w-4 h-4 accent-accent" />
              <span className="text-sm text-fg">Require email</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={editAllowMultiple} onChange={(e) => setEditAllowMultiple(e.target.checked)} className="w-4 h-4 accent-accent" />
              <span className="text-sm text-fg">Allow multiple submissions</span>
            </label>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={saveFormEdit} disabled={savingForm} className="flex-1">
              {savingForm ? "Saving..." : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setShowEditForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FieldPreview({ type, label, placeholder, options, required }: {
  type: FieldType;
  label: string;
  placeholder: string;
  options: string[];
  required: boolean;
}) {
  const iClass = "mt-1 w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg-muted text-sm";
  return (
    <div>
      <label className="text-sm font-medium text-fg">
        {label}{required && <span className="text-status-red-fg ml-1">*</span>}
      </label>
      {type === "TEXT" && <input className={iClass} placeholder={placeholder || "Short text answer"} readOnly />}
      {type === "TEXTAREA" && <textarea className={`${iClass} resize-none`} rows={3} placeholder={placeholder || "Long text answer"} readOnly />}
      {type === "NUMBER" && <input type="number" className={iClass} placeholder={placeholder || "0"} readOnly />}
      {type === "EMAIL" && <input type="email" className={iClass} placeholder={placeholder || "email@example.com"} readOnly />}
      {type === "DATE" && <input type="date" className={iClass} readOnly />}
      {type === "SELECT" && (
        <select className={iClass} disabled>
          <option>{placeholder || "Select an option..."}</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      )}
      {type === "MULTI_SELECT" && (
        <div className="mt-1 space-y-1">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-fg-secondary">
              <input type="checkbox" className="w-4 h-4" disabled /> {o}
            </label>
          ))}
        </div>
      )}
      {type === "CHECKBOX" && (
        <label className="flex items-center gap-2 mt-1 text-sm text-fg-secondary">
          <input type="checkbox" className="w-4 h-4" disabled /> {label}
        </label>
      )}
      {type === "RADIO" && (
        <div className="mt-1 space-y-1">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-fg-secondary">
              <input type="radio" className="w-4 h-4" disabled /> {o}
            </label>
          ))}
        </div>
      )}
      {type === "RATING" && (
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className="text-2xl text-fg-muted hover:text-status-amber-fg" disabled>★</button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => {
        const h = d.count > 0 ? Math.max((d.count / max) * 100, 8) : 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${d.date}: ${d.count} submission${d.count !== 1 ? "s" : ""}`}
          >
            <div
              className="w-full rounded-t bg-accent transition-all"
              style={{ height: `${h}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function FieldAnalyticCard({ data }: { data: FieldAnalytic }) {
  return (
    <div className="bg-card border border-edge rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-medium text-fg">{data.label}</h4>
        <Badge variant={FIELD_TYPE_BADGE[data.fieldType] ?? "neutral"}>
          {TYPE_LABELS[data.fieldType] ?? data.fieldType}
        </Badge>
        <span className="text-sm text-fg-muted ml-auto">{data.totalResponses} responses</span>
      </div>

      {data.fieldType === "NUMBER" && data.totalResponses > 0 && (
        <div className="flex gap-6">
          {[["Min", data.min], ["Max", data.max], ["Avg", data.avg?.toFixed(1)]].map(([k, v]) => (
            <div key={k as string}>
              <div className="text-2xl font-bold text-fg">{v}</div>
              <div className="text-xs text-fg-muted">{k}</div>
            </div>
          ))}
        </div>
      )}

      {data.fieldType === "RATING" && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold text-fg">{data.avgRating?.toFixed(1) ?? "—"}</span>
            <span className="text-fg-muted text-sm">avg rating</span>
          </div>
          {data.distribution && [5, 4, 3, 2, 1].map((star) => {
            const count = data.distribution![String(star)] ?? 0;
            const total = data.totalResponses || 1;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-fg-muted w-8">{star} ★</span>
                <div className="flex-1 h-4 bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-status-amber rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span className="text-sm text-fg-muted w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {(data.fieldType === "SELECT" || data.fieldType === "RADIO" || data.fieldType === "MULTI_SELECT") && data.optionCounts && (
        <div className="space-y-2">
          {Object.entries(data.optionCounts).map(([opt, count]) => {
            const max = Math.max(...Object.values(data.optionCounts!), 1);
            return (
              <div key={opt} className="flex items-center gap-3">
                <span className="text-sm text-fg-secondary w-32 truncate">{opt}</span>
                <div className="flex-1 h-5 bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="text-sm text-fg-muted w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {data.fieldType === "CHECKBOX" && (
        <div className="flex gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-status-green-fg">{data.trueCount ?? 0}</div>
            <div className="text-xs text-fg-muted">Checked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-fg-muted">{data.falseCount ?? 0}</div>
            <div className="text-xs text-fg-muted">Unchecked</div>
          </div>
        </div>
      )}

      {["TEXT", "TEXTAREA", "EMAIL", "DATE"].includes(data.fieldType) && (
        <p className="text-sm text-fg-muted">{data.totalResponses} text responses collected</p>
      )}
    </div>
  );
}

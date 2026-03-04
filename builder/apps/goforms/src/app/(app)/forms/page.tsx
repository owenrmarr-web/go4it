"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import FormField from "@/components/FormField";
import { DocumentIcon, PlusIcon, PencilIcon, TrashIcon } from "@/components/Icons";

type FormType = "FORM" | "SURVEY" | "CHECKLIST";
type FormStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

interface FormItem {
  id: string;
  title: string;
  description: string | null;
  type: FormType;
  status: FormStatus;
  slug: string;
  submissionCount: number;
  fieldCount: number;
  allowMultiple: boolean;
  requireName: boolean;
  requireEmail: boolean;
  createdAt: string;
  lastSubmission: string | null;
}

const STATUS_TABS: { key: "ALL" | FormStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "ACTIVE", label: "Active" },
  { key: "CLOSED", label: "Closed" },
  { key: "ARCHIVED", label: "Archived" },
];

const TYPE_LABELS: Record<FormType, string> = {
  FORM: "Form",
  SURVEY: "Survey",
  CHECKLIST: "Checklist",
};

const typeBadgeVariant = (type: FormType): "neutral" | "info" | "warning" => {
  if (type === "SURVEY") return "info";
  if (type === "CHECKLIST") return "warning";
  return "neutral";
};

const statusBadgeVariant = (status: FormStatus): "neutral" | "success" | "warning" => {
  if (status === "ACTIVE") return "success";
  if (status === "CLOSED") return "warning";
  return "neutral";
};

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm";

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FormStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | FormType>("ALL");
  const [sortBy, setSortBy] = useState<"created" | "title" | "submissions">("created");

  // Create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState<FormItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<FormType>("FORM");
  const [formRequireName, setFormRequireName] = useState(true);
  const [formRequireEmail, setFormRequireEmail] = useState(true);
  const [formAllowMultiple, setFormAllowMultiple] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<FormItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forms");
      if (!res.ok) throw new Error("Failed");
      setForms(await res.json());
    } catch {
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditForm(null);
    setFormTitle("");
    setFormDesc("");
    setFormType("FORM");
    setFormRequireName(true);
    setFormRequireEmail(true);
    setFormAllowMultiple(false);
    setShowModal(true);
  };

  const openEdit = (f: FormItem) => {
    setEditForm(f);
    setFormTitle(f.title);
    setFormDesc(f.description ?? "");
    setFormType(f.type);
    setFormRequireName(f.requireName);
    setFormRequireEmail(f.requireEmail);
    setFormAllowMultiple(f.allowMultiple);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        type: formType,
        requireName: formRequireName,
        requireEmail: formRequireEmail,
        allowMultiple: formAllowMultiple,
      };
      if (editForm) {
        const res = await fetch(`/api/forms/${editForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Form updated");
        setShowModal(false);
        load();
      } else {
        const res = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        toast.success("Form created");
        setShowModal(false);
        router.push(`/forms/${created.id}`);
      }
    } catch {
      toast.error("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/forms/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Form deleted");
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete form");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = forms
    .filter((f) => statusFilter === "ALL" || f.status === statusFilter)
    .filter((f) => typeFilter === "ALL" || f.type === typeFilter)
    .filter((f) => !search || f.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "submissions") return b.submissionCount - a.submissionCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Forms"
        action={
          <Button variant="primary" onClick={openCreate}>
            <span className="flex items-center gap-2"><PlusIcon /> New Form</span>
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-edge mb-4 mt-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              statusFilter === tab.key
                ? "text-accent-fg border-b-2 border-accent-fg"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {tab.label}
            {tab.key !== "ALL" && (
              <span className="ml-1.5 text-xs text-fg-dim">
                ({forms.filter((f) => f.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Search forms..." />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "ALL" | FormType)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none"
        >
          <option value="ALL">All Types</option>
          <option value="FORM">Form</option>
          <option value="SURVEY">Survey</option>
          <option value="CHECKLIST">Checklist</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none"
        >
          <option value="created">Newest first</option>
          <option value="title">Title A–Z</option>
          <option value="submissions">Most submissions</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-fg-muted">Loading forms...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon />}
          message={search || statusFilter !== "ALL" ? "No forms match your filters" : "No forms yet"}
          actionLabel={!search && statusFilter === "ALL" ? "Create your first form" : undefined}
          onAction={!search && statusFilter === "ALL" ? openCreate : undefined}
        />
      ) : (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-elevated">
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Title</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium hidden sm:table-cell">Fields</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium hidden sm:table-cell">Submissions</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium hidden lg:table-cell">Created</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium hidden lg:table-cell">Last submission</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((form, idx) => (
                <tr
                  key={form.id}
                  className={`border-b border-edge last:border-0 hover:bg-hover transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-elevated/30"}`}
                  onClick={() => router.push(`/forms/${form.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{form.title}</p>
                    {form.description && (
                      <p className="text-xs text-fg-muted truncate max-w-xs">{form.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={typeBadgeVariant(form.type)}>{TYPE_LABELS[form.type]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(form.status)}>{form.status.charAt(0) + form.status.slice(1).toLowerCase()}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-fg-secondary hidden sm:table-cell">{form.fieldCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-fg hidden sm:table-cell">{form.submissionCount}</td>
                  <td className="px-4 py-3 text-right text-fg-muted hidden lg:table-cell">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right text-fg-muted hidden lg:table-cell">
                    {form.lastSubmission ? new Date(form.lastSubmission).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(form)}
                        className="p-1.5 rounded-md hover:bg-hover text-fg-muted hover:text-fg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(form)}
                        className="p-1.5 rounded-md hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editForm ? "Edit Form" : "New Form"}
      >
        <div className="space-y-4">
          <FormField label="Title" required>
            <input
              className={inputClass}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Client Intake Form"
              autoFocus
            />
          </FormField>
          <FormField label="Description">
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Optional description shown at the top of the form"
            />
          </FormField>
          {!editForm && (
            <FormField label="Type">
              <select
                className={inputClass}
                value={formType}
                onChange={(e) => setFormType(e.target.value as FormType)}
              >
                <option value="FORM">Form</option>
                <option value="SURVEY">Survey</option>
                <option value="CHECKLIST">Checklist</option>
              </select>
            </FormField>
          )}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formRequireName}
                onChange={(e) => setFormRequireName(e.target.checked)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-fg">Require respondent name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formRequireEmail}
                onChange={(e) => setFormRequireEmail(e.target.checked)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-fg">Require respondent email</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formAllowMultiple}
                onChange={(e) => setFormAllowMultiple(e.target.checked)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-fg">Allow multiple submissions from same person</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : editForm ? "Save Changes" : "Create Form"}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Form"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        destructive
        loading={deleting}
      />
    </div>
  );
}

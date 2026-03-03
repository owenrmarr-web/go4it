"use client";

import { useState } from "react";
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

// --- Types ---

type DocumentType =
  | "OFFER_LETTER"
  | "CONTRACT"
  | "ID_DOCUMENT"
  | "TAX_FORM"
  | "POLICY"
  | "CERTIFICATION"
  | "OTHER";

interface DocumentRecord {
  id: string;
  title: string;
  type: DocumentType;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  expiresAt: string | null;
  profileId: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  profile: {
    id: string;
    user: { id: string; name: string | null };
  } | null;
}

interface Profile {
  id: string;
  user: { id: string; name: string | null };
}

interface DocumentsClientProps {
  documents: DocumentRecord[];
  profiles: Profile[];
}

// --- Constants ---

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "CONTRACT", label: "Contract" },
  { value: "ID_DOCUMENT", label: "ID Document" },
  { value: "TAX_FORM", label: "Tax Form" },
  { value: "POLICY", label: "Policy" },
  { value: "CERTIFICATION", label: "Certification" },
  { value: "OTHER", label: "Other" },
];

const TYPE_BADGE_VARIANT: Record<DocumentType, "info" | "neutral" | "warning" | "success"> = {
  OFFER_LETTER: "info",
  CONTRACT: "info",
  ID_DOCUMENT: "neutral",
  TAX_FORM: "neutral",
  POLICY: "warning",
  CERTIFICATION: "success",
  OTHER: "neutral",
};

const TYPE_LABELS: Record<DocumentType, string> = {
  OFFER_LETTER: "Offer Letter",
  CONTRACT: "Contract",
  ID_DOCUMENT: "ID Document",
  TAX_FORM: "Tax Form",
  POLICY: "Policy",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

type TabValue = "all" | "company" | "employee";

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "company", label: "Company-Wide" },
  { value: "employee", label: "Employee" },
];

// --- Helpers ---

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

// --- Form state ---

interface FormState {
  title: string;
  type: DocumentType | "";
  description: string;
  profileId: string;
  expiresAt: string;
  fileName: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  type: "",
  description: "",
  profileId: "",
  expiresAt: "",
  fileName: "",
};

// --- Component ---

export default function DocumentsClient({ documents, profiles }: DocumentsClientProps) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">("");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);

  // Form
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Filtering ---

  const filtered = documents.filter((doc) => {
    // Search
    if (search) {
      const q = search.toLowerCase();
      if (!doc.title.toLowerCase().includes(q)) return false;
    }

    // Tab
    if (activeTab === "company" && doc.profileId !== null) return false;
    if (activeTab === "employee" && doc.profileId === null) return false;

    // Type filter
    if (typeFilter && doc.type !== typeFilter) return false;

    return true;
  });

  // --- Handlers ---

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowCreateModal(true);
  }

  function closeCreate() {
    setShowCreateModal(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(doc: DocumentRecord) {
    setForm({
      title: doc.title,
      type: doc.type,
      description: doc.description || "",
      profileId: doc.profileId || "",
      expiresAt: doc.expiresAt ? doc.expiresAt.slice(0, 10) : "",
      fileName: doc.fileName || "",
    });
    setEditingDoc(doc);
  }

  function closeEdit() {
    setEditingDoc(null);
    setForm(EMPTY_FORM);
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.type) {
      toast.error("Title and type are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          description: form.description.trim() || null,
          profileId: form.profileId || null,
          expiresAt: form.expiresAt || null,
          fileName: form.fileName.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create document");
      }

      toast.success("Document created");
      closeCreate();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingDoc) return;
    if (!form.title.trim() || !form.type) {
      toast.error("Title and type are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${editingDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          description: form.description.trim() || null,
          profileId: form.profileId || null,
          expiresAt: form.expiresAt || null,
          fileName: form.fileName.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update document");
      }

      toast.success("Document updated");
      closeEdit();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update document");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingDoc) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deletingDoc.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete document");
      }

      toast.success("Document deleted");
      setDeletingDoc(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }

  // --- Form fields renderer (shared between create & edit) ---

  function renderFormFields() {
    return (
      <div className="space-y-4">
        <FormField label="Title" required htmlFor="doc-title">
          <input
            id="doc-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="e.g. Employment Agreement"
          />
        </FormField>

        <FormField label="Type" required htmlFor="doc-type">
          <select
            id="doc-type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as DocumentType | "" })}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">Select type...</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Description" htmlFor="doc-description">
          <textarea
            id="doc-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            placeholder="Optional description..."
          />
        </FormField>

        <FormField label="Employee" htmlFor="doc-profile">
          <select
            id="doc-profile"
            value={form.profileId}
            onChange={(e) => setForm({ ...form, profileId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">Company-Wide</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.name || "Unnamed Employee"}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Expires At" htmlFor="doc-expires">
          <input
            id="doc-expires"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </FormField>

        <FormField label="File Name" htmlFor="doc-filename">
          <input
            id="doc-filename"
            type="text"
            value={form.fileName}
            onChange={(e) => setForm({ ...form, fileName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="e.g. contract_v2.pdf"
          />
        </FormField>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="p-6">
      <PageHeader
        title="Documents"
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="w-4 h-4" />
            Add Document
          </Button>
        }
      />

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title..."
          className="sm:w-72"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as DocumentType | "")}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="">All Types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-edge">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.value
                ? "border-accent-fg text-accent-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon />}
          message="No documents found"
          description={
            documents.length === 0
              ? "Add your first document to get started."
              : "Try adjusting your search or filters."
          }
          actionLabel={documents.length === 0 ? "Add Document" : undefined}
          onAction={documents.length === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge bg-elevated">
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Created Date</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Expires At</th>
                  <th className="text-right px-4 py-3 font-medium text-fg-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const expiringSoon = isExpiringSoon(doc.expiresAt);

                  return (
                    <tr
                      key={doc.id}
                      className="border-b border-edge last:border-0 hover:bg-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-fg">{doc.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={TYPE_BADGE_VARIANT[doc.type]}>
                          {TYPE_LABELS[doc.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {doc.profile ? doc.profile.user.name || "Unnamed" : "Company-Wide"}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className={`px-4 py-3 ${expiringSoon ? "text-status-amber-fg font-medium" : "text-fg-secondary"}`}>
                        {doc.expiresAt ? formatDate(doc.expiresAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(doc)}
                            className="p-1.5 rounded-lg text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                            aria-label="Edit document"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingDoc(doc)}
                            className="p-1.5 rounded-lg text-fg-muted hover:bg-hover hover:text-status-red-fg transition-colors"
                            aria-label="Delete document"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={closeCreate} title="Add Document">
        {renderFormFields()}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={closeCreate} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            Create
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingDoc} onClose={closeEdit} title="Edit Document">
        {renderFormFields()}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={closeEdit} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} loading={saving}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deletingDoc?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}

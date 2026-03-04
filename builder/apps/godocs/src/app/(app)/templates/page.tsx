"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import DocumentTypeBadge from "@/components/DocumentTypeBadge";
import { LayersIcon, PlusIcon, PencilIcon, TrashIcon } from "@/components/Icons";

type Template = {
  id: string;
  name: string;
  type: string;
  content: string;
  description: string | null;
  updatedAt: string;
};

const TYPES = ["CONTRACT", "PROPOSAL", "AGREEMENT", "REPORT", "OTHER"];

const defaultForm = { name: "", type: "OTHER", content: "", description: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  function openCreate() {
    setEditingTemplate(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(template: Template) {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      content: template.content,
      description: template.description ?? "",
    });
    setShowModal(true);
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.content.trim()) { toast.error("Content is required"); return; }
    setSaving(true);
    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : "/api/templates";
      const method = editingTemplate ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          content: form.content,
          description: form.description || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editingTemplate ? "Template updated" : "Template created");
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingTemplate) return;
    try {
      const res = await fetch(`/api/templates/${deletingTemplate.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Template deleted");
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeletingTemplate(null);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const filtered = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Templates"
        action={
          <Button variant="primary" onClick={openCreate}>
            <PlusIcon className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        }
      />

      <div className="flex gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search templates..."
          className="flex-1 max-w-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="ALL">All Types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LayersIcon className="w-8 h-8" />}
          message={search || typeFilter !== "ALL" ? "No templates match your filters" : "No templates yet"}
          actionLabel="New Template"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="bg-card border border-edge rounded-xl p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <DocumentTypeBadge type={template.type} />
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(template)}
                    className="p-1.5 rounded-lg text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingTemplate(template)}
                    className="p-1.5 rounded-lg text-fg-muted hover:bg-hover hover:text-status-red-fg transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-fg mb-1">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-fg-muted mb-2 line-clamp-2">{template.description}</p>
              )}
              <p className="text-xs text-fg-muted mt-2 line-clamp-3 font-mono bg-elevated rounded-lg px-3 py-2">
                {template.content.substring(0, 120)}
                {template.content.length > 120 ? "..." : ""}
              </p>
              <p className="text-xs text-fg-muted mt-3">Updated {formatDate(template.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingTemplate ? "Edit Template" : "New Template"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name" required className="col-span-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Standard Service Agreement"
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            </FormField>

            <FormField label="Type">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Description">
              <input
                type="text"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Brief description"
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </FormField>
          </div>

          <FormField label="Content" required>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={10}
              placeholder="Template body text..."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono resize-y"
            />
          </FormField>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={
          deletingTemplate
            ? `Are you sure you want to delete "${deletingTemplate.name}"? This cannot be undone.`
            : ""
        }
        destructive
      />
    </div>
  );
}

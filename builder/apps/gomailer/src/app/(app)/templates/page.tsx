"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { DocumentIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  updatedAt: string;
  _count: { campaigns: number };
}

const CATEGORIES = ["GENERAL", "NEWSLETTER", "PROMOTION", "ANNOUNCEMENT", "WELCOME", "OTHER"];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showDelete, setShowDelete] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSubject("");
    setBody("");
    setCategory("GENERAL");
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setCategory(t.category);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body, category }),
    });

    if (res.ok) {
      toast.success(editing ? "Template updated" : "Template created");
      setShowModal(false);
      fetchTemplates();
    } else {
      toast.error("Failed to save template");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const res = await fetch(`/api/templates/${showDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      setShowDelete(null);
      fetchTemplates();
    } else {
      toast.error("Failed to delete template");
    }
  };

  const filtered = templates.filter((t) => {
    const matchesCategory = categoryFilter === "ALL" || t.category === categoryFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryVariant = (cat: string): "success" | "info" | "warning" | "error" | "neutral" => {
    const map: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
      NEWSLETTER: "info",
      PROMOTION: "warning",
      ANNOUNCEMENT: "info",
      WELCOME: "success",
      GENERAL: "neutral",
      OTHER: "neutral",
    };
    return map[cat] || "neutral";
  };

  if (loading) {
    return <div className="text-fg-muted p-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        action={
          <Button variant="primary" onClick={openCreate}>
            New Template
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search templates..."
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon />}
          message={search || categoryFilter !== "ALL" ? "No templates match your filters" : "No templates yet"}
          actionLabel="Create Template"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-card rounded-xl border border-edge p-5 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => openEdit(t)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-fg truncate flex-1">{t.name}</h3>
                <Badge variant={categoryVariant(t.category)}>{t.category}</Badge>
              </div>
              <p className="text-sm text-fg-secondary truncate">{t.subject}</p>
              <p className="text-xs text-fg-muted mt-2 line-clamp-2">
                {t.body.slice(0, 100)}
                {t.body.length > 100 && "..."}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-edge">
                <span className="text-xs text-fg-dim">
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDelete(t);
                  }}
                  className="text-xs text-status-red-fg hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Template" : "New Template"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </FormField>
          <FormField label="Subject" required>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </FormField>
          <FormField label="Body" required>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
              required
            />
          </FormField>
          <FormField label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        onConfirm={handleDelete}
        message={
          showDelete && showDelete._count.campaigns > 0
            ? `This template is used by ${showDelete._count.campaigns} campaign(s). Are you sure you want to delete it?`
            : "Are you sure you want to delete this template? This cannot be undone."
        }
        destructive
      />
    </div>
  );
}

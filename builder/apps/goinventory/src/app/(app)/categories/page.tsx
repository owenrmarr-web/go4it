"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { TagIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { products: number };
}

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", color: "#6366f1" });
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", color: c.color });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editing ? "Category updated" : "Category created");
      setShowModal(false);
      fetchCategories();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted");
      setDeleteTarget(null);
      fetchCategories();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete");
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Categories" action={<Button onClick={openCreate}>Add Category</Button>} />

      <SearchInput value={search} onChange={setSearch} placeholder="Search categories..." className="mb-6 max-w-sm" />

      {loading ? (
        <p className="text-fg-muted text-sm py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<TagIcon />} message="No categories yet" description="Create categories to organize your products." actionLabel="Add Category" onAction={openCreate} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border border-edge p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <div>
                    <h3 className="font-semibold text-fg">{c.name}</h3>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {c._count.products} product{c._count.products !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}>Delete</Button>
                </div>
              </div>
              {c.description && (
                <p className="text-sm text-fg-secondary mt-3">{c.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <FormField label="Name" required>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Color">
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    form.color === color ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border border-edge"
              />
            </div>
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "Save Changes" : "Create Category"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={
          deleteTarget && deleteTarget._count.products > 0
            ? `This category has ${deleteTarget._count.products} product(s). Reassign them before deleting.`
            : "Are you sure you want to delete this category? This cannot be undone."
        }
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

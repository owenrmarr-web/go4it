"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import { FolderIcon, PlusIcon } from "@/components/Icons";
import { toast } from "sonner";

interface SpaceItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  order: number;
  _count: { pages: number };
}

export default function SpacesClient({ spaces: initialSpaces }: { spaces: SpaceItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("order");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SpaceItem | null>(null);
  const [deleting, setDeleting] = useState<SpaceItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "📁", color: "#6366f1", order: 0 });
  const [saving, setSaving] = useState(false);

  const spaces = initialSpaces
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "pageCount") return b._count.pages - a._count.pages;
      return a.order - b.order;
    });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", icon: "📁", color: "#6366f1", order: 0 });
    setShowModal(true);
  };

  const openEdit = (space: SpaceItem) => {
    setEditing(space);
    setForm({
      name: space.name,
      description: space.description || "",
      icon: space.icon,
      color: space.color,
      order: space.order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `/api/spaces/${editing.id}` : "/api/spaces";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editing ? "Space updated" : "Space created");
      setShowModal(false);
      router.refresh();
    } catch {
      toast.error("Failed to save space");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/spaces/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Space deleted");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete space");
    }
  };

  return (
    <div>
      <PageHeader
        title="Spaces"
        action={
          <Button variant="primary" onClick={openCreate}>
            <PlusIcon className="w-4 h-4 mr-1" /> New Space
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search spaces..." />
        </div>
        <select
          className="bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-sm text-fg"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="order">Manual Order</option>
          <option value="name">Name</option>
          <option value="pageCount">Page Count</option>
        </select>
      </div>

      {spaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="bg-card rounded-xl border border-edge p-4 hover:bg-hover transition-colors group"
            >
              <Link href={`/spaces/${space.id}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{space.icon}</span>
                  <div>
                    <h3 className="font-medium text-fg">{space.name}</h3>
                    <p className="text-xs text-fg-muted">
                      {space._count.pages} {space._count.pages === 1 ? "page" : "pages"}
                    </p>
                  </div>
                </div>
                {space.description && (
                  <p className="text-sm text-fg-secondary line-clamp-2">{space.description}</p>
                )}
                <div className="h-1 rounded-full mt-3" style={{ backgroundColor: space.color }} />
              </Link>
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(space)}
                  className="text-xs text-accent-fg hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleting(space)}
                  className="text-xs text-status-red-fg hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderIcon />}
          message="No spaces yet"
          actionLabel="Create Space"
          onAction={openCreate}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Space" : "Create Space"}
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Operations Manual"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="What is this space for?"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Icon">
              <input
                className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
            </FormField>
            <FormField label="Color">
              <input
                type="color"
                className="w-full h-10 bg-input-bg border border-edge-strong rounded-lg px-1 cursor-pointer"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Sort Order">
            <input
              type="number"
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Space"
        message={
          deleting && deleting._count.pages > 0
            ? `"${deleting.name}" has ${deleting._count.pages} pages. Move or delete them first.`
            : `Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`
        }
        destructive
      />
    </div>
  );
}

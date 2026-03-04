"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { FolderIcon, PlusIcon, PencilIcon, TrashIcon } from "@/components/Icons";

type Folder = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  parentId: string | null;
  children: FolderChild[];
  _count: { documents: number; children: number };
};

type FolderChild = {
  id: string;
  name: string;
  color: string;
  _count: { documents: number };
};

const COLORS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Purple", value: "#a855f7" },
  { label: "Gray", value: "#6b7280" },
  { label: "Teal", value: "#14b8a6" },
];

const defaultForm = { name: "", description: "", color: "#6366f1", parentId: "" };

export default function FoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  async function fetchFolders() {
    const res = await fetch("/api/folders");
    if (res.ok) setFolders(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchFolders(); }, []);

  function openCreate() {
    setEditingFolder(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(folder: Folder) {
    setEditingFolder(folder);
    setForm({
      name: folder.name,
      description: folder.description ?? "",
      color: folder.color,
      parentId: folder.parentId ?? "",
    });
    setShowModal(true);
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editingFolder ? `/api/folders/${editingFolder.id}` : "/api/folders";
      const method = editingFolder ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          color: form.color,
          parentId: form.parentId || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editingFolder ? "Folder updated" : "Folder created");
      setShowModal(false);
      fetchFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingFolder) return;
    try {
      const res = await fetch(`/api/folders/${deletingFolder.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Folder deleted");
      setDeletingFolder(null);
      fetchFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeletingFolder(null);
    }
  }

  const rootFolders = folders.filter((f) => !f.parentId);
  const filtered = rootFolders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Folders"
        action={
          <Button variant="primary" onClick={openCreate}>
            <PlusIcon className="w-4 h-4 mr-1.5" />
            New Folder
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search folders..."
        className="max-w-sm"
      />

      {loading ? (
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="w-8 h-8" />}
          message={search ? "No folders match your search" : "No folders yet"}
          actionLabel="New Folder"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((folder) => (
            <div
              key={folder.id}
              className="bg-card border border-edge rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div
                className="px-5 py-4 cursor-pointer"
                onClick={() => router.push(`/folders/${folder.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: folder.color + "22", color: folder.color }}
                    >
                      <FolderIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-fg">{folder.name}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {folder._count.documents} doc{folder._count.documents !== 1 ? "s" : ""}
                        {folder._count.children > 0 && ` · ${folder._count.children} subfolders`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(folder)}
                      className="p-1.5 rounded-lg text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFolder(folder)}
                      className="p-1.5 rounded-lg text-fg-muted hover:bg-hover hover:text-status-red-fg transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {folder.description && (
                  <p className="text-sm text-fg-muted mt-3 line-clamp-2">{folder.description}</p>
                )}
              </div>

              {/* Subfolders */}
              {folder.children.length > 0 && (
                <div className="border-t border-edge px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    {folder.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/folders/${child.id}`);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs hover:bg-hover transition-colors"
                        style={{ color: child.color }}
                      >
                        <FolderIcon className="w-3 h-3" />
                        <span className="text-fg-secondary">{child.name}</span>
                        <span className="text-fg-muted">({child._count.documents})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingFolder ? "Edit Folder" : "New Folder"}
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Client Contracts"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>

          <FormField label="Parent Folder">
            <select
              value={form.parentId}
              onChange={(e) => set("parentId", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">— Root folder —</option>
              {rootFolders
                .filter((f) => !editingFolder || f.id !== editingFolder.id)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </FormField>

          <FormField label="Color">
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("color", c.value)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    form.color === c.value ? "scale-125 ring-2 ring-offset-1 ring-edge-strong" : ""
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </FormField>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingFolder ? "Save Changes" : "Create Folder"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        onConfirm={handleDelete}
        title="Delete Folder"
        message={
          deletingFolder
            ? `Are you sure you want to delete "${deletingFolder.name}"? Documents must be moved or deleted first.`
            : ""
        }
        destructive
      />
    </div>
  );
}

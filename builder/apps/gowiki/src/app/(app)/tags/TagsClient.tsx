"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import { TagIcon, PlusIcon } from "@/components/Icons";
import { toast } from "sonner";

interface PageInfo {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  space: { id: string; name: string; icon: string; color: string };
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  _count: { pageTags: number };
  pageTags: { page: PageInfo }[];
}

export default function TagsClient({ tags: initialTags }: { tags: TagItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TagItem | null>(null);
  const [deleting, setDeleting] = useState<TagItem | null>(null);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });
  const [saving, setSaving] = useState(false);

  const tags = initialTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", color: "#6366f1" });
    setShowModal(true);
  };

  const openEdit = (tag: TagItem) => {
    setEditing(tag);
    setForm({ name: tag.name, color: tag.color });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `/api/tags/${editing.id}` : "/api/tags";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editing ? "Tag updated" : "Tag created");
      setShowModal(false);
      router.refresh();
    } catch {
      toast.error("Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/tags/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Tag deleted");
      setDeleting(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete tag");
    }
  };

  return (
    <div>
      <PageHeader
        title="Tags"
        action={
          <Button variant="primary" onClick={openCreate}>
            <PlusIcon className="w-4 h-4 mr-1" /> New Tag
          </Button>
        }
      />

      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tags..." />
      </div>

      {tags.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-card rounded-xl border border-edge p-4 group"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedTag(expandedTag === tag.id ? null : tag.id)}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-fg">{tag.name}</h3>
                    <p className="text-xs text-fg-muted">
                      {tag._count.pageTags} {tag._count.pageTags === 1 ? "page" : "pages"}
                    </p>
                  </div>
                  <span className="text-fg-muted text-xs">
                    {expandedTag === tag.id ? "▲" : "▼"}
                  </span>
                </div>

                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(tag); }}
                    className="text-xs text-accent-fg hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(tag); }}
                    className="text-xs text-status-red-fg hover:underline"
                  >
                    Delete
                  </button>
                </div>

                {expandedTag === tag.id && tag.pageTags.length > 0 && (
                  <div className="mt-3 border-t border-edge pt-3 space-y-2">
                    {tag.pageTags.map((pt) => (
                      <Link
                        key={pt.page.id}
                        href={`/pages/${pt.page.id}`}
                        className="flex items-center gap-2 text-sm hover:text-accent-fg"
                      >
                        <span className="text-fg truncate flex-1">{pt.page.title}</span>
                        <Badge
                          variant={pt.page.status === "PUBLISHED" ? "success" : pt.page.status === "ARCHIVED" ? "neutral" : "warning"}
                        >
                          {pt.page.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<TagIcon />}
          message="No tags yet"
          actionLabel="Create Tag"
          onAction={openCreate}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Tag" : "Create Tag"}
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Safety, Training"
            />
          </FormField>
          <FormField label="Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-10 h-10 bg-input-bg border border-edge-strong rounded-lg cursor-pointer"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
              <span className="text-sm text-fg-muted">{form.color}</span>
            </div>
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
        title="Delete Tag"
        message={`Are you sure you want to delete "${deleting?.name}"? It will be removed from all pages. This cannot be undone.`}
        destructive
      />
    </div>
  );
}

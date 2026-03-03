"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import {
  BellIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/Icons";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  publishDate: string;
  expiresAt: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementsClientProps {
  announcements: Announcement[];
}

interface AnnouncementForm {
  title: string;
  content: string;
  priority: string;
  publishDate: string;
  expiresAt: string;
  pinned: boolean;
}

type PriorityFilter = "ALL" | "NORMAL" | "IMPORTANT" | "URGENT";

const priorityVariant: Record<string, "neutral" | "warning" | "error"> = {
  NORMAL: "neutral",
  IMPORTANT: "warning",
  URGENT: "error",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function defaultForm(): AnnouncementForm {
  return {
    title: "",
    content: "",
    priority: "NORMAL",
    publishDate: todayString(),
    expiresAt: "",
    pinned: false,
  };
}

export default function AnnouncementsClient({
  announcements,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [showExpired, setShowExpired] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const priorityTabs: { label: string; value: PriorityFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Normal", value: "NORMAL" },
    { label: "Important", value: "IMPORTANT" },
    { label: "Urgent", value: "URGENT" },
  ];

  const filtered = announcements.filter((ann) => {
    if (priorityFilter !== "ALL" && ann.priority !== priorityFilter) {
      return false;
    }
    if (!showExpired && isExpired(ann.expiresAt)) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });

  function openCreate() {
    setEditingAnnouncement(null);
    setForm(defaultForm());
    setModalOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditingAnnouncement(ann);
    setForm({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      publishDate: ann.publishDate.slice(0, 10),
      expiresAt: ann.expiresAt ? ann.expiresAt.slice(0, 10) : "",
      pinned: ann.pinned,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingAnnouncement(null);
    setForm(defaultForm());
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingAnnouncement
        ? `/api/announcements/${editingAnnouncement.id}`
        : "/api/announcements";
      const method = editingAnnouncement ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          publishDate: form.publishDate,
          expiresAt: form.expiresAt || null,
          pinned: form.pinned,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save announcement");
      }

      toast.success(
        editingAnnouncement ? "Announcement updated" : "Announcement created"
      );
      closeModal();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save announcement";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete announcement");
      }

      toast.success("Announcement deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete announcement";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="w-4 h-4" />
            New Announcement
          </Button>
        }
      />

      {/* Priority Filter Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1 bg-elevated rounded-lg p-1">
          {priorityTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPriorityFilter(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                priorityFilter === tab.value
                  ? "bg-card text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Show Expired Toggle */}
        <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="rounded border-edge-strong"
          />
          Show expired
        </label>
      </div>

      {/* Announcement List */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<BellIcon />}
          message="No announcements"
          description="Create your first announcement to keep your team informed."
          actionLabel="New Announcement"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((ann) => {
            const expired = isExpired(ann.expiresAt);

            return (
              <div
                key={ann.id}
                className={`bg-card border border-edge rounded-xl p-5 hover:border-edge-strong transition-colors ${
                  expired ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {ann.pinned && <span className="text-sm">📌</span>}
                      <h3 className="font-semibold text-fg text-base">
                        {ann.title}
                      </h3>
                      <Badge variant={priorityVariant[ann.priority] || "neutral"}>
                        {ann.priority}
                      </Badge>
                      {expired && (
                        <Badge variant="neutral">Expired</Badge>
                      )}
                    </div>

                    <p className="text-sm text-fg-secondary whitespace-pre-line mb-3">
                      {ann.content}
                    </p>

                    <p className="text-xs text-fg-muted">
                      {formatDate(ann.publishDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(ann)}
                      className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                      title="Edit announcement"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(ann)}
                      className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                      title="Delete announcement"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editingAnnouncement ? "Edit Announcement" : "New Announcement"
        }
      >
        <div className="space-y-4">
          <FormField label="Title" required htmlFor="ann-title">
            <input
              id="ann-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Announcement title"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Content" required htmlFor="ann-content">
            <textarea
              id="ann-content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your announcement..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </FormField>

          <FormField label="Priority" htmlFor="ann-priority">
            <select
              id="ann-priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="NORMAL">Normal</option>
              <option value="IMPORTANT">Important</option>
              <option value="URGENT">Urgent</option>
            </select>
          </FormField>

          <FormField label="Publish Date" htmlFor="ann-publish-date">
            <input
              id="ann-publish-date"
              type="date"
              value={form.publishDate}
              onChange={(e) =>
                setForm({ ...form, publishDate: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Expires At" htmlFor="ann-expires-at">
            <input
              id="ann-expires-at"
              type="date"
              value={form.expiresAt}
              onChange={(e) =>
                setForm({ ...form, expiresAt: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              className="rounded border-edge-strong"
            />
            <span className="text-sm font-medium text-fg-secondary">
              Pin this announcement
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={closeModal} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editingAnnouncement ? "Save Changes" : "Create Announcement"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}

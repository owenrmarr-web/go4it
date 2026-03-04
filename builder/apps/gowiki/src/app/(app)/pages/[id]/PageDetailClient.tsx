"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import UserAvatar from "@/components/UserAvatar";
import { ClockIcon, DocumentIcon } from "@/components/Icons";
import { toast } from "sonner";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface RevisionItem {
  id: string;
  content: string;
  changeNotes: string | null;
  revisionNumber: number;
  createdAt: string;
  editor: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  viewCount: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  spaceId: string;
  parentId: string | null;
  space: { id: string; name: string; icon: string; color: string };
  author: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
  lastEditedBy: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
  parent: { id: string; title: string } | null;
  children: { id: string; title: string; status: string; updatedAt: string }[];
  revisions: RevisionItem[];
  pageTags: { tag: TagItem }[];
  _count: { children: number; revisions: number };
}

export default function PageDetailClient({
  page,
  allSpaces,
  allTags,
  spacePages,
}: {
  page: PageData;
  allSpaces: { id: string; name: string }[];
  allTags: TagItem[];
  spacePages: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRevision, setShowRevision] = useState<RevisionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: page.title,
    content: page.content,
    spaceId: page.spaceId,
    parentId: page.parentId || "",
    changeNotes: "",
    tagIds: page.pageTags.map((pt) => pt.tag.id),
  });

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Page updated");
      setShowEdit(false);
      router.refresh();
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Page ${newStatus.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePin = async () => {
    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !page.pinned }),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      toast.success(page.pinned ? "Page unpinned" : "Page pinned");
      router.refresh();
    } catch {
      toast.error("Failed to toggle pin");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Page deleted");
      router.push("/pages");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-fg-muted mb-4">
        <Link href="/pages" className="hover:text-accent-fg">All Pages</Link>
        <span>/</span>
        <Link href={`/spaces/${page.space.id}`} className="hover:text-accent-fg">
          {page.space.icon} {page.space.name}
        </Link>
        {page.parent && (
          <>
            <span>/</span>
            <Link href={`/pages/${page.parent.id}`} className="hover:text-accent-fg">
              {page.parent.title}
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-2">
              <h1 className="text-2xl font-bold text-fg flex-1">
                {page.pinned && <span className="mr-2">📌</span>}
                {page.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: page.space.color }}
              >
                {page.space.icon} {page.space.name}
              </span>
              <Badge
                variant={
                  page.status === "PUBLISHED" ? "success" :
                  page.status === "ARCHIVED" ? "neutral" : "warning"
                }
              >
                {page.status}
              </Badge>
              {page.pageTags.map((pt) => (
                <span
                  key={pt.tag.id}
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: pt.tag.color }}
                >
                  {pt.tag.name}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button variant="primary" onClick={() => setShowEdit(true)}>Edit</Button>
            {page.status === "DRAFT" && (
              <Button variant="secondary" onClick={() => handleStatusChange("PUBLISHED")}>
                Publish
              </Button>
            )}
            {page.status === "PUBLISHED" && (
              <>
                <Button variant="secondary" onClick={() => handleStatusChange("ARCHIVED")}>
                  Archive
                </Button>
                <Button variant="secondary" onClick={handlePin}>
                  {page.pinned ? "Unpin" : "Pin"}
                </Button>
              </>
            )}
            {page.status === "ARCHIVED" && (
              <Button variant="secondary" onClick={() => handleStatusChange("DRAFT")}>
                Restore
              </Button>
            )}
            {(page.status === "DRAFT" || page.status === "ARCHIVED") && (
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                Delete
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="bg-card rounded-xl border border-edge p-6">
            <div className="prose max-w-none text-fg-secondary whitespace-pre-wrap">
              {page.content}
            </div>
          </div>

          {/* Sub-pages */}
          {page.children.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-fg mb-3">Sub-pages</h2>
              <div className="bg-card rounded-xl border border-edge divide-y divide-edge">
                {page.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/pages/${child.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-hover transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <DocumentIcon className="w-4 h-4 text-fg-muted" />
                    <span className="font-medium text-fg flex-1">{child.title}</span>
                    <Badge
                      variant={child.status === "PUBLISHED" ? "success" : child.status === "ARCHIVED" ? "neutral" : "warning"}
                    >
                      {child.status}
                    </Badge>
                    <span className="text-xs text-fg-muted">
                      {new Date(child.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Revision History */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-fg mb-3">
              Revision History ({page.revisions.length})
            </h2>
            <div className="bg-card rounded-xl border border-edge divide-y divide-edge">
              {page.revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center gap-3 p-3 hover:bg-hover transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                  onClick={() => setShowRevision(rev)}
                >
                  <ClockIcon className="w-4 h-4 text-fg-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-fg text-sm">
                      Revision {rev.revisionNumber}
                    </span>
                    {rev.changeNotes && (
                      <p className="text-xs text-fg-muted truncate">{rev.changeNotes}</p>
                    )}
                  </div>
                  {rev.editor && <UserAvatar name={rev.editor.name || "User"} size="sm" />}
                  <span className="text-xs text-fg-muted flex-shrink-0">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-edge p-4 space-y-3">
            <h3 className="font-semibold text-fg text-sm">Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-fg-muted">Author</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {page.author && (
                    <>
                      <UserAvatar name={page.author.name || "User"} size="sm" />
                      <span className="text-fg">{page.author.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <span className="text-fg-muted">Created</span>
                <p className="text-fg">{new Date(page.createdAt).toLocaleDateString()}</p>
              </div>
              {page.lastEditedBy && (
                <div>
                  <span className="text-fg-muted">Last edited by</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <UserAvatar name={page.lastEditedBy.name || "User"} size="sm" />
                    <span className="text-fg">{page.lastEditedBy.name}</span>
                  </div>
                </div>
              )}
              <div>
                <span className="text-fg-muted">Updated</span>
                <p className="text-fg">{new Date(page.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-fg-muted">Views</span>
                <p className="text-fg">{page.viewCount}</p>
              </div>
              <div>
                <span className="text-fg-muted">Revisions</span>
                <p className="text-fg">{page._count.revisions}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Page">
        <div className="space-y-4">
          <FormField label="Title" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </FormField>
          <FormField label="Space">
            <select
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.spaceId}
              onChange={(e) => setForm({ ...form, spaceId: e.target.value })}
            >
              {allSpaces.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Parent Page">
            <select
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">None (top-level)</option>
              {spacePages.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Content" required>
            <textarea
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg font-mono text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={12}
            />
          </FormField>
          <FormField label="Change Notes">
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.changeNotes}
              onChange={(e) => setForm({ ...form, changeNotes: e.target.value })}
              placeholder="What did you change?"
            />
          </FormField>
          <FormField label="Tags">
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.tagIds.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, tagIds: [...form.tagIds, tag.id] });
                      } else {
                        setForm({ ...form, tagIds: form.tagIds.filter((id) => id !== tag.id) });
                      }
                    }}
                  />
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </label>
              ))}
            </div>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revision View Modal */}
      <Modal
        open={!!showRevision}
        onClose={() => setShowRevision(null)}
        title={showRevision ? `Revision ${showRevision.revisionNumber}` : ""}
      >
        {showRevision && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-fg-muted">
              {showRevision.editor && (
                <div className="flex items-center gap-1">
                  <UserAvatar name={showRevision.editor.name || "User"} size="sm" />
                  <span>{showRevision.editor.name}</span>
                </div>
              )}
              <span>{new Date(showRevision.createdAt).toLocaleString()}</span>
            </div>
            {showRevision.changeNotes && (
              <p className="text-sm text-fg-secondary italic">{showRevision.changeNotes}</p>
            )}
            <div className="bg-elevated rounded-lg p-4 text-sm text-fg-secondary whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
              {showRevision.content}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Page"
        message={
          page.children.length > 0
            ? `"${page.title}" has ${page.children.length} sub-pages. They will become top-level pages. Are you sure?`
            : `Are you sure you want to delete "${page.title}"? This cannot be undone.`
        }
        destructive
      />
    </div>
  );
}

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
import EmptyState from "@/components/EmptyState";
import { DocumentIcon, PlusIcon } from "@/components/Icons";
import { toast } from "sonner";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface PageItem {
  id: string;
  title: string;
  status: string;
  pinned: boolean;
  parentId: string | null;
  updatedAt: string;
  order: number;
  author: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
  pageTags: { tag: TagItem }[];
  _count: { children: number; revisions: number };
}

interface SpaceData {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  pages: PageItem[];
  _count: { pages: number };
}

export default function SpaceDetailClient({
  space,
  allSpaces,
  allTags,
}: {
  space: SpaceData;
  allSpaces: { id: string; name: string }[];
  allTags: TagItem[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingSpace, setEditingSpace] = useState(false);
  const [spaceForm, setSpaceForm] = useState({
    name: space.name,
    description: space.description || "",
    icon: space.icon,
    color: space.color,
  });
  const [pageForm, setPageForm] = useState({
    title: "",
    content: "",
    parentId: "",
    status: "DRAFT",
    tagIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const topLevelPages = space.pages.filter((p) => !p.parentId);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const childrenOf = (parentId: string) =>
    space.pages.filter((p) => p.parentId === parentId);

  const handleCreatePage = async () => {
    if (!pageForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pageForm,
          spaceId: space.id,
          parentId: pageForm.parentId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create page");
      toast.success("Page created");
      setShowCreate(false);
      setPageForm({ title: "", content: "", parentId: "", status: "DRAFT", tagIds: [] });
      router.refresh();
    } catch {
      toast.error("Failed to create page");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSpace = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/spaces/${space.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spaceForm),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Space updated");
      setEditingSpace(false);
      router.refresh();
    } catch {
      toast.error("Failed to update space");
    } finally {
      setSaving(false);
    }
  };

  const renderPage = (page: PageItem, depth: number = 0) => {
    const children = childrenOf(page.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(page.id);

    return (
      <div key={page.id}>
        <div
          className="flex items-center gap-3 px-3 py-2 hover:bg-hover transition-colors rounded-lg"
          style={{ paddingLeft: `${12 + depth * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(page.id)}
              className="text-fg-muted hover:text-fg w-5 text-center"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="w-5" />
          )}
          {page.pinned && <span className="text-sm">📌</span>}
          <Link
            href={`/pages/${page.id}`}
            className="flex-1 min-w-0 flex items-center gap-2"
          >
            <span className="font-medium text-fg truncate">{page.title}</span>
            <Badge
              variant={
                page.status === "PUBLISHED"
                  ? "success"
                  : page.status === "ARCHIVED"
                  ? "neutral"
                  : "warning"
              }
            >
              {page.status}
            </Badge>
          </Link>
          {page.author && (
            <UserAvatar name={page.author.name || "User"} size="sm" />
          )}
          <span className="text-xs text-fg-muted flex-shrink-0">
            {new Date(page.updatedAt).toLocaleDateString()}
          </span>
        </div>
        {isExpanded &&
          children.map((child) => renderPage(child, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/spaces" className="text-sm text-accent-fg hover:underline mb-2 inline-block">
          ← Back to Spaces
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{space.icon}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-fg">{space.name}</h1>
            {space.description && (
              <p className="text-fg-secondary mt-1">{space.description}</p>
            )}
            <p className="text-sm text-fg-muted mt-1">
              {space._count.pages} {space._count.pages === 1 ? "page" : "pages"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditingSpace(true)}>
              Edit Space
            </Button>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <PlusIcon className="w-4 h-4 mr-1" /> Add Page
            </Button>
          </div>
        </div>
        <div className="h-1 rounded-full mt-4" style={{ backgroundColor: space.color }} />
      </div>

      {/* Page Tree */}
      {topLevelPages.length > 0 ? (
        <div className="bg-card rounded-xl border border-edge divide-y divide-edge">
          {topLevelPages.map((page) => renderPage(page))}
        </div>
      ) : (
        <EmptyState
          icon={<DocumentIcon />}
          message="No pages in this space"
          actionLabel="Create Page"
          onAction={() => setShowCreate(true)}
        />
      )}

      {/* Create Page Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Page"
      >
        <div className="space-y-4">
          <FormField label="Title" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={pageForm.title}
              onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
              placeholder="Page title"
            />
          </FormField>
          <FormField label="Content" required>
            <textarea
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg font-mono text-sm"
              value={pageForm.content}
              onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
              rows={8}
              placeholder="Write your page content..."
            />
          </FormField>
          <FormField label="Parent Page">
            <select
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={pageForm.parentId}
              onChange={(e) => setPageForm({ ...pageForm, parentId: e.target.value })}
            >
              <option value="">None (top-level)</option>
              {space.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Tags">
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={pageForm.tagIds.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPageForm({ ...pageForm, tagIds: [...pageForm.tagIds, tag.id] });
                      } else {
                        setPageForm({ ...pageForm, tagIds: pageForm.tagIds.filter((id) => id !== tag.id) });
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
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreatePage} disabled={saving || !pageForm.title.trim()}>
              {saving ? "Creating..." : "Create Page"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Space Modal */}
      <Modal
        open={editingSpace}
        onClose={() => setEditingSpace(false)}
        title="Edit Space"
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={spaceForm.name}
              onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
            />
          </FormField>
          <FormField label="Description">
            <textarea
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={spaceForm.description}
              onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })}
              rows={2}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Icon">
              <input
                className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
                value={spaceForm.icon}
                onChange={(e) => setSpaceForm({ ...spaceForm, icon: e.target.value })}
              />
            </FormField>
            <FormField label="Color">
              <input
                type="color"
                className="w-full h-10 bg-input-bg border border-edge-strong rounded-lg px-1 cursor-pointer"
                value={spaceForm.color}
                onChange={(e) => setSpaceForm({ ...spaceForm, color: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingSpace(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateSpace} disabled={saving}>
              {saving ? "Saving..." : "Update Space"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

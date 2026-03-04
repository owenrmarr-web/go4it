"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import UserAvatar from "@/components/UserAvatar";
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
  viewCount: number;
  pinned: boolean;
  updatedAt: string;
  space: { id: string; name: string; icon: string; color: string };
  author: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
  lastEditedBy: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
  pageTags: { tag: TagItem }[];
  _count: { children: number; revisions: number };
}

export default function PagesClient({
  pages: initialPages,
  spaces,
  tags,
}: {
  pages: PageItem[];
  spaces: { id: string; name: string }[];
  tags: TagItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [spaceFilter, setSpaceFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    spaceId: spaces[0]?.id || "",
    parentId: "",
    status: "DRAFT",
    tagIds: [] as string[],
  });

  const filtered = initialPages
    .filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (spaceFilter && p.space.id !== spaceFilter) return false;
      if (tagFilter && !p.pageTags.some((pt) => pt.tag.id === tagFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "viewCount") return b.viewCount - a.viewCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.spaceId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create");
      const page = await res.json();
      toast.success("Page created");
      setShowCreate(false);
      router.push(`/pages/${page.id}`);
    } catch {
      toast.error("Failed to create page");
    } finally {
      setSaving(false);
    }
  };

  const statuses = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

  return (
    <div>
      <PageHeader
        title="All Pages"
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <PlusIcon className="w-4 h-4 mr-1" /> New Page
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-4">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === s
                ? "bg-accent text-white"
                : "bg-card text-fg-secondary hover:bg-hover"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search pages..." />
        </div>
        <select
          className="bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-sm text-fg"
          value={spaceFilter}
          onChange={(e) => setSpaceFilter(e.target.value)}
        >
          <option value="">All Spaces</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className="bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-sm text-fg"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          className="bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-sm text-fg"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updatedAt">Recently Updated</option>
          <option value="title">Title</option>
          <option value="viewCount">Most Viewed</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge bg-elevated">
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Space</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Tags</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Author</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Updated</th>
                  <th className="text-right px-4 py-3 font-medium text-fg-muted">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {filtered.map((page) => (
                  <tr key={page.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/pages/${page.id}`} className="font-medium text-fg hover:text-accent-fg">
                        {page.pinned && <span className="mr-1">📌</span>}
                        {page.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: page.space.color }}
                      >
                        {page.space.icon} {page.space.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={page.status === "PUBLISHED" ? "success" : page.status === "ARCHIVED" ? "neutral" : "warning"}>
                        {page.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
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
                    </td>
                    <td className="px-4 py-3">
                      {page.author && <UserAvatar name={page.author.name || "User"} size="sm" />}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-fg-muted">{page.viewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<DocumentIcon />}
          message="No pages found"
          actionLabel="Create Page"
          onAction={() => setShowCreate(true)}
        />
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Page">
        <div className="space-y-4">
          <FormField label="Title" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Page title"
            />
          </FormField>
          <FormField label="Space" required>
            <select
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={form.spaceId}
              onChange={(e) => setForm({ ...form, spaceId: e.target.value })}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Content" required>
            <textarea
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg font-mono text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              placeholder="Write your page content..."
            />
          </FormField>
          <FormField label="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
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
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.spaceId}>
              {saving ? "Creating..." : "Create Page"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

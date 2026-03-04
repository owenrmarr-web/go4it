"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import Badge from "@/components/Badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { TrashIcon, CheckCircleIcon } from "@/components/Icons";
import { toast } from "sonner";
import Link from "next/link";

type Category = { id: string; name: string };
type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  categoryId: string | null;
  category: Category | null;
  updatedAt: string;
};

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
}

export default function KBArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", content: "", categoryId: "", status: "DRAFT",
  });

  const fetchData = useCallback(async () => {
    const [artRes, catsRes] = await Promise.all([
      fetch(`/api/kb/${id}`),
      fetch("/api/kb/categories"),
    ]);
    if (artRes.status === 404) { setNotFound(true); return; }
    if (artRes.ok) {
      const art: Article = await artRes.json();
      setArticle(art);
      setForm({ title: art.title, slug: art.slug, content: art.content, categoryId: art.categoryId || "", status: art.status });
    }
    if (catsRes.ok) setCategories(await catsRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function updateForm(updates: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...updates }));
    setDirty(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/kb/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryId: form.categoryId || null }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setArticle(updated);
      setDirty(false);
      toast.success("Article saved");
    } else {
      toast.error("Failed to save article.");
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/kb/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Article deleted");
      router.push("/kb");
    } else {
      toast.error("Failed to delete.");
    }
    setDeleteConfirm(false);
  }

  async function toggleStatus() {
    const newStatus = form.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const res = await fetch(`/api/kb/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setArticle(updated);
      setForm((f) => ({ ...f, status: newStatus }));
      toast.success(newStatus === "PUBLISHED" ? "Article published" : "Article set to draft");
    }
  }

  if (loading) return <div className="p-8 text-center text-fg-muted">Loading...</div>;
  if (notFound) return (
    <div className="p-8 text-center">
      <p className="text-fg-muted mb-4">Article not found.</p>
      <Link href="/kb" className="text-accent-fg hover:underline">Back to knowledge base</Link>
    </div>
  );
  if (!article) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Link href="/kb" className="hover:text-fg">Knowledge Base</Link>
          <span className="text-fg-dim">/</span>
          <span className="text-fg truncate max-w-48">{article.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={form.status === "PUBLISHED" ? "success" : "neutral"}>
            {form.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-fg-muted">
            <span className="text-xs">{article.viewCount} views</span>
            {(article.helpfulCount + article.notHelpfulCount) > 0 && (
              <span className="text-xs text-fg-muted">
                · {Math.round((article.helpfulCount / (article.helpfulCount + article.notHelpfulCount)) * 100)}% helpful
              </span>
            )}
          </div>
          <Button variant="secondary" onClick={() => setPreview(!preview)}>
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            variant={form.status === "PUBLISHED" ? "secondary" : "primary"}
            onClick={toggleStatus}
          >
            {form.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
          {dirty && (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 rounded-lg text-fg-dim hover:text-status-red-fg hover:bg-status-red transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {preview ? (
        /* Preview mode */
        <div className="bg-card border border-edge rounded-xl p-8 max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              {article.category && (
                <span className="text-xs text-fg-muted">{article.category.name}</span>
              )}
              <Badge variant={form.status === "PUBLISHED" ? "success" : "neutral"}>
                {form.status === "PUBLISHED" ? "Published" : "Draft"}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-fg">{form.title}</h1>
          </div>
          <div className="prose text-fg-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {form.content}
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <FormField label="Title" required>
              <input
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent font-medium text-base"
                value={form.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  updateForm({ title: newTitle, slug: generateSlug(newTitle) });
                }}
              />
            </FormField>
            <FormField label="Content" required>
              <textarea
                rows={24}
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent resize-y font-mono"
                placeholder="Write your article content here... (Markdown supported)"
                value={form.content}
                onChange={(e) => updateForm({ content: e.target.value })}
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-edge rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Settings</h3>
              <FormField label="Category">
                <select
                  className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                  value={form.categoryId}
                  onChange={(e) => updateForm({ categoryId: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="URL Slug">
                <input
                  className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-xs font-mono focus:outline-none focus:border-accent"
                  value={form.slug}
                  onChange={(e) => updateForm({ slug: e.target.value })}
                />
              </FormField>
              <div className="pt-2 border-t border-edge">
                <div className="flex items-center gap-2 text-xs text-fg-muted">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-status-green-fg" />
                  {article.helpfulCount} helpful
                </div>
                <div className="flex items-center gap-2 text-xs text-fg-muted mt-1">
                  <span className="w-3.5 h-3.5 text-center text-fg-dim">✗</span>
                  {article.notHelpfulCount} not helpful
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={handleSave} disabled={saving || !dirty} className="w-full">
              {saving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Article"
        message="Are you sure you want to delete this article? This cannot be undone."
        destructive
      />
    </div>
  );
}

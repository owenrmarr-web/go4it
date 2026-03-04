"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { PlusIcon, TrashIcon, PencilIcon, DocumentIcon } from "@/components/Icons";
import { toast } from "sonner";

type Category = { id: string; name: string; description: string | null; order: number; _count: { articles: number } };
type Article = { id: string; title: string; slug: string; status: string; viewCount: number; helpfulCount: number; notHelpfulCount: number; updatedAt: string; categoryId: string | null; category: Category | null };

function statusVariant(s: string): "success" | "default" {
  return s === "PUBLISHED" ? "success" : "default";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function helpfulPct(a: Article) {
  const total = a.helpfulCount + a.notHelpfulCount;
  if (total === 0) return null;
  return Math.round((a.helpfulCount / total) * 100);
}

export default function KBPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Article modals
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [articleForm, setArticleForm] = useState({
    title: "", content: "", categoryId: "", status: "DRAFT",
  });

  // Category modals
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "", order: 0 });
  const [savingCat, setSavingCat] = useState(false);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const [articlesRes, catsRes] = await Promise.all([
      fetch(`/api/kb?${params.toString()}`),
      fetch("/api/kb/categories"),
    ]);
    if (articlesRes.ok) setArticles(await articlesRes.json());
    if (catsRes.ok) setCategories(await catsRes.json());
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Generate slug from title
  function generateSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
  }

  async function handleCreateArticle() {
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setCreatingArticle(true);
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...articleForm,
        slug: generateSlug(articleForm.title),
        categoryId: articleForm.categoryId || null,
      }),
    });
    setCreatingArticle(false);
    if (res.ok) {
      const article = await res.json();
      toast.success("Article created");
      setShowCreateArticle(false);
      setArticleForm({ title: "", content: "", categoryId: "", status: "DRAFT" });
      router.push(`/kb/${article.id}`);
    } else {
      toast.error("Failed to create article.");
    }
  }

  async function handleDeleteArticle(id: string) {
    const res = await fetch(`/api/kb/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Article deleted");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast.error("Failed to delete article.");
    }
    setDeleteArticleId(null);
  }

  async function handleSaveCat() {
    if (!catForm.name.trim()) { toast.error("Category name is required."); return; }
    setSavingCat(true);
    const url = editCat ? `/api/kb/categories/${editCat.id}` : "/api/kb/categories";
    const method = editCat ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    });
    setSavingCat(false);
    if (res.ok) {
      toast.success(editCat ? "Category updated" : "Category created");
      setShowCreateCat(false);
      setEditCat(null);
      setCatForm({ name: "", description: "", order: 0 });
      fetchData();
    } else {
      toast.error("Failed to save category.");
    }
  }

  async function handleDeleteCat(id: string) {
    const res = await fetch(`/api/kb/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted");
      fetchData();
    } else {
      toast.error("Failed to delete category.");
    }
    setDeleteCatId(null);
  }

  // Group articles by category
  const uncategorized = articles.filter((a) => !a.categoryId);
  const categorizedMap = categories.reduce<Record<string, Article[]>>((acc, cat) => {
    acc[cat.id] = articles.filter((a) => a.categoryId === cat.id);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Knowledge Base"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setShowCreateCat(true); setCatForm({ name: "", description: "", order: categories.length }); }}>
              Manage Categories
            </Button>
            <Button variant="primary" onClick={() => setShowCreateArticle(true)}>
              <PlusIcon className="w-4 h-4" /> New Article
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex gap-1">
          {[{ label: "All", value: "ALL" }, { label: "Published", value: "PUBLISHED" }, { label: "Draft", value: "DRAFT" }].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? "bg-accent text-accent-fg font-medium"
                  : "text-fg-muted hover:text-fg hover:bg-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Search articles..." />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-fg-muted">Loading...</div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon />}
          message="No articles found"
          description="Create your first knowledge base article."
          actionLabel="New Article"
          onAction={() => setShowCreateArticle(true)}
        />
      ) : (
        <div className="mt-6 space-y-6">
          {/* Categorized articles */}
          {categories.map((cat) => {
            const catArticles = categorizedMap[cat.id] || [];
            if (catArticles.length === 0) return null;
            return (
              <div key={cat.id} className="bg-card border border-edge rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-edge bg-elevated">
                  <div>
                    <h2 className="font-semibold text-fg">{cat.name}</h2>
                    {cat.description && <p className="text-xs text-fg-muted">{cat.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fg-muted">{cat._count.articles} article{cat._count.articles !== 1 ? "s" : ""}</span>
                    <button
                      onClick={() => { setEditCat(cat); setCatForm({ name: cat.name, description: cat.description || "", order: cat.order }); }}
                      className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-hover transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCatId(cat.id)}
                      className="p-1.5 rounded text-fg-muted hover:text-status-red-fg hover:bg-status-red transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <ArticleTable
                  articles={catArticles}
                  onView={(id) => router.push(`/kb/${id}`)}
                  onDelete={(id) => setDeleteArticleId(id)}
                />
              </div>
            );
          })}

          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <div className="bg-card border border-edge rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-edge bg-elevated">
                <h2 className="font-semibold text-fg">Uncategorized</h2>
              </div>
              <ArticleTable
                articles={uncategorized}
                onView={(id) => router.push(`/kb/${id}`)}
                onDelete={(id) => setDeleteArticleId(id)}
              />
            </div>
          )}
        </div>
      )}

      {/* Create Article Modal */}
      <Modal open={showCreateArticle} onClose={() => setShowCreateArticle(false)} title="New Article" size="lg">
        <div className="space-y-4">
          <FormField label="Title" required>
            <input
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="How to..."
              value={articleForm.title}
              onChange={(e) => setArticleForm((f) => ({ ...f, title: e.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <select
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                value={articleForm.categoryId}
                onChange={(e) => setArticleForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                value={articleForm.status}
                onChange={(e) => setArticleForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </FormField>
          </div>
          <FormField label="Content" required>
            <textarea
              rows={8}
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent resize-none font-mono"
              placeholder="Write your article here... (Markdown supported)"
              value={articleForm.content}
              onChange={(e) => setArticleForm((f) => ({ ...f, content: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateArticle(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateArticle} disabled={creatingArticle}>
              {creatingArticle ? "Creating..." : "Create & Edit"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit Category Modal */}
      <Modal
        open={showCreateCat || !!editCat}
        onClose={() => { setShowCreateCat(false); setEditCat(null); }}
        title={editCat ? "Edit Category" : "New Category"}
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <input
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              value={catForm.name}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Description">
            <input
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              value={catForm.description}
              onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
          <FormField label="Sort Order">
            <input
              type="number"
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              value={catForm.order}
              onChange={(e) => setCatForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowCreateCat(false); setEditCat(null); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveCat} disabled={savingCat}>
              {savingCat ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteArticleId}
        onClose={() => setDeleteArticleId(null)}
        onConfirm={() => deleteArticleId && handleDeleteArticle(deleteArticleId)}
        title="Delete Article"
        message="Are you sure you want to delete this article? This cannot be undone."
        destructive
      />
      <ConfirmDialog
        open={!!deleteCatId}
        onClose={() => setDeleteCatId(null)}
        onConfirm={() => deleteCatId && handleDeleteCat(deleteCatId)}
        title="Delete Category"
        message="Are you sure you want to delete this category? Articles in it will become uncategorized."
        destructive
      />
    </div>
  );
}

function ArticleTable({
  articles,
  onView,
  onDelete,
}: {
  articles: Article[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  function helpfulPct(a: Article) {
    const total = a.helpfulCount + a.notHelpfulCount;
    if (total === 0) return null;
    return Math.round((a.helpfulCount / total) * 100);
  }
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-elevated border-b border-edge">
        <tr>
          <th className="text-left px-5 py-2.5 text-fg-muted font-medium">Title</th>
          <th className="text-left px-5 py-2.5 text-fg-muted font-medium">Status</th>
          <th className="text-left px-5 py-2.5 text-fg-muted font-medium hidden md:table-cell">Views</th>
          <th className="text-left px-5 py-2.5 text-fg-muted font-medium hidden md:table-cell">Helpful</th>
          <th className="text-left px-5 py-2.5 text-fg-muted font-medium hidden lg:table-cell">Updated</th>
          <th className="w-10" />
        </tr>
      </thead>
      <tbody className="divide-y divide-edge">
        {articles.map((article) => {
          const pct = helpfulPct(article);
          return (
            <tr
              key={article.id}
              onClick={() => onView(article.id)}
              className="hover:bg-hover cursor-pointer transition-colors"
            >
              <td className="px-5 py-3 font-medium text-fg">{article.title}</td>
              <td className="px-5 py-3">
                <Badge variant={article.status === "PUBLISHED" ? "success" : "neutral"}>
                  {article.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
              </td>
              <td className="px-5 py-3 hidden md:table-cell text-fg-secondary">{article.viewCount}</td>
              <td className="px-5 py-3 hidden md:table-cell text-fg-secondary">
                {pct !== null ? `${pct}%` : "—"}
              </td>
              <td className="px-5 py-3 hidden lg:table-cell text-fg-muted">{formatDate(article.updatedAt)}</td>
              <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onDelete(article.id)}
                  className="p-1.5 rounded-lg text-fg-dim hover:text-status-red-fg hover:bg-status-red transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

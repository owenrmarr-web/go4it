"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { LayersIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  reorderPoint: number;
  unit: string;
  status: string;
  categoryId: string | null;
  category: Category | null;
  updatedAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    unitPrice: "0",
    costPrice: "0",
    quantity: "0",
    reorderPoint: "0",
    unit: "each",
    status: "ACTIVE",
    categoryId: "",
  });

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    params.set("sort", sortBy);
    params.set("order", sortOrder);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", sku: "", description: "", unitPrice: "0", costPrice: "0", quantity: "0", reorderPoint: "0", unit: "each", status: "ACTIVE", categoryId: "" });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description || "",
      unitPrice: String(p.unitPrice),
      costPrice: String(p.costPrice),
      quantity: String(p.quantity),
      reorderPoint: String(p.reorderPoint),
      unit: p.unit,
      status: p.status,
      categoryId: p.categoryId || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) {
      toast.error("Name and SKU are required");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/products/${editing.id}` : "/api/products";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editing ? "Product updated" : "Product created");
      setShowModal(false);
      fetchProducts();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product deleted");
      setDeleteTarget(null);
      fetchProducts();
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const statuses = ["", "ACTIVE", "INACTIVE"];

  return (
    <div className="p-6">
      <PageHeader title="Products" action={<Button onClick={openCreate}>Add Product</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or SKU..." className="sm:w-64" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        {statuses.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === s ? "bg-accent text-white" : "bg-elevated text-fg-secondary hover:bg-hover"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-fg-muted text-sm py-8 text-center">Loading...</p>
      ) : products.length === 0 ? (
        <EmptyState icon={<LayersIcon />} message="No products yet" description="Add your first product to start tracking inventory." actionLabel="Add Product" onAction={openCreate} />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 text-fg-muted font-medium cursor-pointer hover:text-fg" onClick={() => handleSort("name")}>
                  Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">SKU</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Category</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium cursor-pointer hover:text-fg" onClick={() => handleSort("quantity")}>
                  Qty {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Reorder</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium cursor-pointer hover:text-fg" onClick={() => handleSort("unitPrice")}>
                  Price {sortBy === "unitPrice" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-edge hover:bg-hover transition-colors ${
                    p.quantity <= p.reorderPoint && p.status === "ACTIVE" ? "bg-status-red/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="text-accent-fg hover:underline font-medium">
                      {p.name}
                    </Link>
                    {p.quantity <= p.reorderPoint && p.status === "ACTIVE" && (
                      <span className="ml-2 text-status-red-fg text-xs">Low</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{p.sku}</td>
                  <td className="px-4 py-3">
                    {p.category ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.category.color }} />
                        {p.category.name}
                      </span>
                    ) : (
                      <span className="text-fg-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{p.quantity}</td>
                  <td className="px-4 py-3 text-right text-fg-muted">{p.reorderPoint}</td>
                  <td className="px-4 py-3 text-right">${p.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Product" : "Add Product"} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name" required>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="SKU" required>
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Category">
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm">
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Unit">
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm">
              {["each", "kg", "lb", "box", "case", "pair", "set"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Unit Price" required>
            <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Cost Price">
            <input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          {!editing && (
            <FormField label="Initial Quantity">
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
            </FormField>
          )}
          <FormField label="Reorder Point">
            <input type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "Save Changes" : "Create Product"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

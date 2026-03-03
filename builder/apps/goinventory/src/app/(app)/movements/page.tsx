"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import EmptyState from "@/components/EmptyState";
import { ListIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  product: { name: string; sku: string };
  user: { name: string | null };
}

const TYPE_TABS = [
  { label: "All", value: "" },
  { label: "Received", value: "RECEIVED" },
  { label: "Sold", value: "SOLD" },
  { label: "Adjusted", value: "ADJUSTED" },
  { label: "Returned", value: "RETURNED" },
  { label: "Damaged", value: "DAMAGED" },
];

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    type: "SOLD",
    quantity: "1",
    notes: "",
  });

  const fetchMovements = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const res = await fetch(`/api/movements?${params}`);
    const data = await res.json();
    setMovements(data);
    setLoading(false);
  }, [typeFilter, dateFrom, dateTo]);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products?status=ACTIVE");
    const data = await res.json();
    setProducts(data);
  }, []);

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, [fetchMovements, fetchProducts]);

  const openCreate = () => {
    setForm({ productId: "", type: "SOLD", quantity: "1", notes: "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.productId) {
      toast.error("Select a product");
      return;
    }
    if (!form.quantity || parseInt(form.quantity) === 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Stock adjustment recorded");
      setShowModal(false);
      fetchMovements();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setSaving(false);
  };

  const movementTypeBadge = (type: string) => {
    const variants: Record<string, "success" | "info" | "warning" | "neutral" | "error"> = {
      RECEIVED: "success",
      SOLD: "info",
      ADJUSTED: "warning",
      RETURNED: "neutral",
      DAMAGED: "error",
    };
    return variants[type] || "neutral";
  };

  return (
    <div className="p-6">
      <PageHeader title="Stock Movements" action={<Button onClick={openCreate}>Record Adjustment</Button>} />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
              typeFilter === tab.value ? "bg-accent text-white" : "bg-elevated text-fg-secondary hover:bg-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-fg-muted text-sm py-8 text-center">Loading...</p>
      ) : movements.length === 0 ? (
        <EmptyState icon={<ListIcon />} message="No stock movements" description="Record stock adjustments to track inventory changes." actionLabel="Record Adjustment" onAction={openCreate} />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Date</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Type</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Product</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Quantity</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Notes</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-edge hover:bg-hover transition-colors">
                  <td className="px-4 py-3 text-fg-muted">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={movementTypeBadge(m.type)}>{m.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-fg">{m.product.name}</td>
                  <td className={`px-4 py-3 text-right font-medium ${m.quantity > 0 ? "text-status-green-fg" : "text-status-red-fg"}`}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">{m.notes || "—"}</td>
                  <td className="px-4 py-3 text-fg-muted">{m.user?.name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Stock Adjustment">
        <div className="space-y-4">
          <FormField label="Product" required>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Type" required>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
            >
              <option value="SOLD">Sold</option>
              <option value="ADJUSTED">Adjusted</option>
              <option value="RETURNED">Returned</option>
              <option value="DAMAGED">Damaged</option>
            </select>
          </FormField>
          <FormField label="Quantity" required>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
            />
            <p className="text-xs text-fg-muted mt-1">
              {form.type === "ADJUSTED"
                ? "Positive adds stock, negative removes stock"
                : form.type === "RETURNED"
                ? "Positive value — adds stock back"
                : "Will be deducted from stock"}
            </p>
          </FormField>
          <FormField label="Notes">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              placeholder="Reason for adjustment..."
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Record Movement</Button>
        </div>
      </Modal>
    </div>
  );
}

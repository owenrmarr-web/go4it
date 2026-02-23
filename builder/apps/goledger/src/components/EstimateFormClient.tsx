"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LineItemEditor from "./LineItemEditor";

interface Client {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

interface EstimateFormClientProps {
  clients: Client[];
  categories: Category[];
  taxRate: number;
  nextNumber: string;
  estimate?: {
    id: string;
    clientId: string;
    issueDate: string;
    expiresAt: string | null;
    categoryId: string | null;
    notes: string | null;
    memo: string | null;
    taxRate: number;
    lineItems: LineItem[];
  };
}

export default function EstimateFormClient({
  clients,
  categories,
  taxRate: defaultTaxRate,
  nextNumber,
  estimate,
}: EstimateFormClientProps) {
  const router = useRouter();
  const isEditing = !!estimate;

  const [clientId, setClientId] = useState(estimate?.clientId ?? "");
  const [issueDate, setIssueDate] = useState(
    estimate?.issueDate?.split("T")[0] ?? new Date().toISOString().split("T")[0]
  );
  const [expiresAt, setExpiresAt] = useState(
    estimate?.expiresAt?.split("T")[0] ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    })()
  );
  const [categoryId, setCategoryId] = useState(estimate?.categoryId ?? "");
  const [notes, setNotes] = useState(estimate?.notes ?? "");
  const [memo, setMemo] = useState(estimate?.memo ?? "");
  const [taxRate, setTaxRate] = useState(estimate?.taxRate ?? defaultTaxRate);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    estimate?.lineItems ?? [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (action: "draft" | "send") => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.length === 0 || lineItems.every((li) => !li.description)) {
      toast.error("Please add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const body = {
        clientId,
        issueDate,
        expiresAt,
        categoryId: categoryId || undefined,
        notes: notes || undefined,
        memo: memo || undefined,
        taxRate,
        lineItems: lineItems.filter((li) => li.description),
      };

      let estimateId = estimate?.id;

      if (isEditing && estimateId) {
        const res = await fetch(`/api/estimates/${estimateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update estimate");
      } else {
        const res = await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create estimate");
        const data = await res.json();
        estimateId = data.id;
      }

      if (action === "send" && estimateId) {
        await fetch(`/api/estimates/${estimateId}/send`, { method: "POST" });
        toast.success("Estimate saved and sent");
      } else {
        toast.success(isEditing ? "Estimate updated" : "Estimate saved as draft");
      }

      router.push(`/estimates/${estimateId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {isEditing ? "Edit Estimate" : "New Estimate"}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
        {!isEditing && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Estimate #: <span className="font-medium text-gray-900 dark:text-gray-100">{nextNumber}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration Date</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
          <LineItemEditor items={lineItems} onChange={setLineItems} taxRate={taxRate} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Not visible to client" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Memo</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Shown to client" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={() => router.back()} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium">Cancel</button>
          <button type="button" onClick={() => handleSubmit("draft")} disabled={saving} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium">
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button type="button" onClick={() => handleSubmit("send")} disabled={saving} className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
            {saving ? "Saving..." : "Save & Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

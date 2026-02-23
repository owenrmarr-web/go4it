"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LineItemEditor from "./LineItemEditor";

interface Client {
  id: string;
  name: string;
  paymentTerms: string | null;
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

interface InvoiceFormClientProps {
  clients: Client[];
  categories: Category[];
  taxRate: number;
  defaultPaymentTerms: string;
  nextNumber: string;
  // For editing existing invoices
  invoice?: {
    id: string;
    clientId: string;
    paymentTerms: string;
    issueDate: string;
    dueDate: string;
    poNumber?: string;
    categoryId?: string;
    notes?: string;
    memo?: string;
    taxRate: number;
    discountType?: string | null;
    discountValue?: number;
    lineItems: LineItem[];
  };
}

const PAYMENT_TERMS = [
  { value: "DUE_ON_RECEIPT", label: "Due on Receipt", days: 0 },
  { value: "NET_15", label: "Net 15", days: 15 },
  { value: "NET_30", label: "Net 30", days: 30 },
  { value: "NET_60", label: "Net 60", days: 60 },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function InvoiceFormClient({
  clients,
  categories,
  taxRate: defaultTaxRate,
  defaultPaymentTerms,
  nextNumber,
  invoice,
}: InvoiceFormClientProps) {
  const router = useRouter();
  const isEditing = !!invoice;

  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [paymentTerms, setPaymentTerms] = useState(invoice?.paymentTerms ?? defaultPaymentTerms);
  const [issueDate, setIssueDate] = useState(
    invoice?.issueDate?.split("T")[0] ?? new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate?.split("T")[0] ??
    addDays(new Date().toISOString().split("T")[0], PAYMENT_TERMS.find((t) => t.value === defaultPaymentTerms)?.days ?? 30)
  );
  const [poNumber, setPoNumber] = useState(invoice?.poNumber ?? "");
  const [categoryId, setCategoryId] = useState(invoice?.categoryId ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [memo, setMemo] = useState(invoice?.memo ?? "");
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? defaultTaxRate);
  const [discountType, setDiscountType] = useState<string | null>(invoice?.discountType ?? null);
  const [discountValue, setDiscountValue] = useState(invoice?.discountValue ?? 0);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems ?? [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const handlePaymentTermsChange = (value: string) => {
    setPaymentTerms(value);
    const term = PAYMENT_TERMS.find((t) => t.value === value);
    if (term) {
      setDueDate(addDays(issueDate, term.days));
    }
  };

  const handleIssueDateChange = (value: string) => {
    setIssueDate(value);
    const term = PAYMENT_TERMS.find((t) => t.value === paymentTerms);
    if (term) {
      setDueDate(addDays(value, term.days));
    }
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client?.paymentTerms) {
      handlePaymentTermsChange(client.paymentTerms);
    }
  };

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
        paymentTerms,
        issueDate,
        dueDate,
        poNumber: poNumber || undefined,
        categoryId: categoryId || undefined,
        notes: notes || undefined,
        memo: memo || undefined,
        taxRate,
        discountType: discountType || undefined,
        discountValue: discountValue || undefined,
        lineItems: lineItems.filter((li) => li.description),
      };

      let invoiceId = invoice?.id;

      if (isEditing && invoiceId) {
        const res = await fetch(`/api/invoices/${invoiceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update invoice");
      } else {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create invoice");
        const data = await res.json();
        invoiceId = data.id;
      }

      if (action === "send" && invoiceId) {
        await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" });
        toast.success("Invoice saved and sent");
      } else {
        toast.success(isEditing ? "Invoice updated" : "Invoice saved as draft");
      }

      router.push(`/invoices/${invoiceId}`);
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
        {isEditing ? "Edit Invoice" : "New Invoice"}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
        {/* Invoice number */}
        {!isEditing && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Invoice #: <span className="font-medium text-gray-900 dark:text-gray-100">{nextNumber}</span>
          </div>
        )}

        {/* Client + Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => handlePaymentTermsChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates + PO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => handleIssueDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Number</label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Category + Tax Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Line Items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
          <LineItemEditor
            items={lineItems}
            onChange={setLineItems}
            taxRate={taxRate}
            discountType={discountType}
            discountValue={discountValue}
            onDiscountChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }}
          />
        </div>

        {/* Notes + Memo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Not visible to client"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Memo</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Shown to client on invoice"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("send")}
            disabled={saving}
            className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {saving ? "Saving..." : "Save & Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

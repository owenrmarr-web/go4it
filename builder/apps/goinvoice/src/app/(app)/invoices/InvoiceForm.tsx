"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import { PlusIcon, TrashIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFormData {
  id?: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  terms: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  invoice?: InvoiceFormData | null;
}

function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateForInput(dateStr?: string) {
  if (!dateStr) {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }
  return new Date(dateStr).toISOString().split("T")[0];
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default function InvoiceForm({
  open,
  onClose,
  onSaved,
  invoice,
}: InvoiceFormProps) {
  const isEditing = !!invoice?.id;

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(formatDateForInput());
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: generateTempId(), description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data))
      .catch(() => toast.error("Failed to load clients"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setClientId(invoice.clientId || "");
      setIssueDate(formatDateForInput(invoice.issueDate));
      setDueDate(formatDateForInput(invoice.dueDate));
      setTaxRate(invoice.taxRate || 0);
      setNotes(invoice.notes || "");
      setTerms(invoice.terms || "");
      setItems(
        invoice.items?.length
          ? invoice.items.map((it) => ({ id: generateTempId(), ...it }))
          : [{ id: generateTempId(), description: "", quantity: 1, unitPrice: 0 }]
      );
    } else {
      setClientId("");
      setIssueDate(formatDateForInput());
      setDueDate(defaultDueDate());
      setTaxRate(0);
      setNotes("");
      setTerms("");
      setItems([{ id: generateTempId(), description: "", quantity: 1, unitPrice: 0 }]);
    }
    setErrors({});
  }, [open, invoice]);

  const updateItem = useCallback(
    (id: string, field: keyof Omit<LineItem, "id">, value: string | number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: generateTempId(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      if (items.length <= 1) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [items.length]
  );

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!clientId) errs.clientId = "Please select a client";
    if (!dueDate) errs.dueDate = "Due date is required";
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) errs.items = "Add at least one line item";
    for (const item of validItems) {
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        errs.items = "All items must have quantity and price greater than 0";
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    const validItems = items
      .filter((it) => it.description.trim())
      .map(({ description, quantity, unitPrice }) => ({
        description,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      }));

    const payload = {
      clientId,
      issueDate,
      dueDate,
      taxRate: Number(taxRate),
      notes,
      terms,
      items: validItems,
    };

    try {
      const url = isEditing ? `/api/invoices/${invoice!.id}` : "/api/invoices";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save invoice");
      }

      toast.success(isEditing ? "Invoice updated" : "Invoice created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Invoice" : "New Invoice"}
      size="lg"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Client & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Client" required error={errors.clientId}>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Issue Date">
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label="Due Date" required error={errors.dueDate}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-fg-secondary">
              Line Items
            </label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg hover:text-accent-fg/80 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>
          {errors.items && (
            <p className="text-xs text-status-red-fg mb-2">{errors.items}</p>
          )}

          <div className="border border-edge rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_100px_90px_36px] gap-2 px-3 py-2 bg-elevated text-xs font-medium text-fg-muted">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {/* Rows */}
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_80px_100px_90px_36px] gap-2 px-3 py-2 border-t border-edge items-center"
              >
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                  }
                  className={`${inputClass} text-right`}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                  }
                  className={`${inputClass} text-right`}
                />
                <span className="text-sm text-fg text-right font-medium tabular-nums">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length <= 1}
                  className="p-1 rounded-lg text-fg-muted hover:text-status-red-fg hover:bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Rate & Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-fg-secondary">Subtotal</span>
              <span className="text-fg font-medium tabular-nums">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-fg-secondary">Tax</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <span className="text-fg-muted text-xs">%</span>
                <span className="text-fg font-medium tabular-nums ml-auto">
                  ${taxAmount.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-edge pt-2">
              <span className="text-fg">Total</span>
              <span className="text-fg tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes for the client..."
              className={inputClass}
            />
          </FormField>
          <FormField label="Terms">
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              placeholder="Payment terms and conditions..."
              className={inputClass}
            />
          </FormField>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-edge">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={saving}>
          {isEditing ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </Modal>
  );
}

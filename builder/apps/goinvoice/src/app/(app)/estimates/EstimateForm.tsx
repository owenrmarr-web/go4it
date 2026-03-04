"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import { PlusIcon, TrashIcon } from "@/components/Icons";

interface Client {
  id: string;
  name: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface EstimateFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editEstimateId?: string;
}

const emptyLineItem: LineItem = { description: "", quantity: 1, unitPrice: 0 };

export default function EstimateForm({
  open,
  onClose,
  onSuccess,
  editEstimateId,
}: EstimateFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ ...emptyLineItem }]);
  const [taxRate, setTaxRate] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const isEdit = !!editEstimateId;

  // Fetch clients
  useEffect(() => {
    if (!open) return;
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load clients"));
  }, [open]);

  // Load existing estimate for editing
  const loadEstimate = useCallback(async () => {
    if (!editEstimateId) return;
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/estimates/${editEstimateId}`);
      if (!res.ok) throw new Error("Failed to load estimate");
      const data = await res.json();
      setClientId(data.clientId);
      setTaxRate(data.taxRate || 0);
      setExpiresAt(
        data.expiresAt
          ? new Date(data.expiresAt).toISOString().split("T")[0]
          : ""
      );
      setNotes(data.notes || "");
      setItems(
        data.items?.length > 0
          ? data.items.map(
              (item: { description: string; quantity: number; unitPrice: number }) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })
            )
          : [{ ...emptyLineItem }]
      );
    } catch {
      toast.error("Failed to load estimate data");
    } finally {
      setLoadingEdit(false);
    }
  }, [editEstimateId]);

  useEffect(() => {
    if (open && editEstimateId) {
      loadEstimate();
    }
  }, [open, editEstimateId, loadEstimate]);

  // Reset form when closing
  useEffect(() => {
    if (!open) {
      setClientId("");
      setItems([{ ...emptyLineItem }]);
      setTaxRate(0);
      setExpiresAt("");
      setNotes("");
    }
  }, [open]);

  // Live total calculation
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyLineItem }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    const validItems = items.filter((item) => item.description.trim());
    if (validItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/estimates/${editEstimateId}`
        : "/api/estimates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          items: validItems,
          taxRate,
          expiresAt: expiresAt || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(isEdit ? "Estimate updated" : "Estimate created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save estimate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Estimate" : "New Estimate"}
      size="lg"
    >
      {loadingEdit ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client */}
          <FormField label="Client" required htmlFor="est-client">
            <select
              id="est-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-fg-secondary">
                Line Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-fg transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 items-start p-3 rounded-lg border border-edge bg-elevated"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      placeholder="Description"
                      className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      placeholder="Qty"
                      min="0"
                      step="any"
                      className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "unitPrice",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      placeholder="Unit Price"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-medium text-fg pt-2">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-2 rounded-lg hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Rate and Expiration */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tax Rate (%)" htmlFor="est-tax">
              <input
                id="est-tax"
                type="number"
                value={taxRate}
                onChange={(e) =>
                  setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))
                }
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </FormField>

            <FormField label="Expiration Date" htmlFor="est-expires">
              <input
                id="est-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </FormField>
          </div>

          {/* Notes */}
          <FormField label="Notes" htmlFor="est-notes">
            <textarea
              id="est-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes or terms..."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </FormField>

          {/* Live Totals */}
          <div className="border-t border-edge pt-4 space-y-1">
            <div className="flex justify-between text-sm text-fg-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm text-fg-secondary">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-fg pt-1">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Update Estimate" : "Create Estimate"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

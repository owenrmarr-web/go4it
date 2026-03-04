"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import EmptyState from "@/components/EmptyState";
import { PlusIcon, CurrencyIcon } from "@/components/Icons";

interface PaymentSummary {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  invoiceNumber: string;
  clientName: string;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  amountPaid: number;
  status: string;
}

interface PaymentListProps {
  initialPayments: PaymentSummary[];
}

const PAYMENT_METHODS = [
  "ALL",
  "CASH",
  "CHECK",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "OTHER",
] as const;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  OTHER: "Other",
};

function methodBadgeVariant(method: string): "neutral" | "info" {
  if (method === "BANK_TRANSFER" || method === "CREDIT_CARD") return "info";
  return "neutral";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PaymentList({ initialPayments }: PaymentListProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [method, setMethod] = useState("OTHER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    if (methodFilter === "ALL") return payments;
    return payments.filter((p) => p.method === methodFilter);
  }, [payments, methodFilter]);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.status !== "PAID" &&
        inv.status !== "CANCELLED" &&
        inv.status !== "DRAFT" &&
        inv.total - inv.amountPaid > 0
    );
  }, [invoices]);

  const selectedInvoice = useMemo(() => {
    return unpaidInvoices.find((inv) => inv.id === selectedInvoiceId) ?? null;
  }, [unpaidInvoices, selectedInvoiceId]);

  async function openModal() {
    setShowModal(true);
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(
        data.map(
          (inv: {
            id: string;
            invoiceNumber: string;
            client: { name: string };
            total: number;
            amountPaid: number;
            status: string;
          }) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.client.name,
            total: inv.total,
            amountPaid: inv.amountPaid,
            status: inv.status,
          })
        )
      );
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoadingInvoices(false);
    }
  }

  function resetForm() {
    setSelectedInvoiceId("");
    setAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setMethod("OTHER");
    setReference("");
    setNotes("");
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  function handleInvoiceSelect(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      const remaining = inv.total - inv.amountPaid;
      setAmount(remaining > 0 ? remaining.toFixed(2) : "");
    }
  }

  async function refreshPayments() {
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPayments(
        data.map(
          (p: {
            id: string;
            amount: number;
            paymentDate: string;
            method: string;
            reference: string | null;
            notes: string | null;
            invoice: {
              invoiceNumber: string;
              client: { name: string };
            };
          }) => ({
            id: p.id,
            amount: p.amount,
            paymentDate: p.paymentDate,
            method: p.method,
            reference: p.reference,
            notes: p.notes,
            invoiceNumber: p.invoice.invoiceNumber,
            clientName: p.invoice.client.name,
          })
        )
      );
    } catch {
      toast.error("Failed to refresh payments");
    }
  }

  async function handleSave() {
    if (!selectedInvoiceId) {
      toast.error("Please select an invoice");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: parsedAmount,
          paymentDate,
          method,
          reference: reference || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }
      toast.success("Payment recorded successfully");
      closeModal();
      refreshPayments();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Track payments received for your invoices"
        action={
          <Button onClick={openModal}>
            <PlusIcon className="w-4 h-4" />
            Record Payment
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="ALL">All Methods</option>
            {PAYMENT_METHODS.filter((m) => m !== "ALL").map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-edge">
          <EmptyState
            icon={<CurrencyIcon />}
            message={
              methodFilter !== "ALL"
                ? "No payments found"
                : "No payments yet"
            }
            description={
              methodFilter !== "ALL"
                ? "Try adjusting your filter."
                : "Record your first payment to get started."
            }
            actionLabel={methodFilter === "ALL" ? "Record Payment" : undefined}
            onAction={methodFilter === "ALL" ? openModal : undefined}
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Date
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Invoice #
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Client
                  </th>
                  <th className="text-right font-medium text-fg-muted px-4 py-3">
                    Amount
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Method
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-edge last:border-b-0 hover:bg-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-fg-secondary">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {payment.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {payment.clientName}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-fg">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={methodBadgeVariant(payment.method)}>
                        {METHOD_LABELS[payment.method] || payment.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {payment.reference || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={showModal} onClose={closeModal} title="Record Payment">
        <div className="space-y-4">
          <FormField label="Invoice" required htmlFor="payment-invoice">
            {loadingInvoices ? (
              <p className="text-sm text-fg-muted py-2">Loading invoices...</p>
            ) : unpaidInvoices.length === 0 ? (
              <p className="text-sm text-fg-muted py-2">
                No unpaid invoices available.
              </p>
            ) : (
              <select
                id="payment-invoice"
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="">Select an invoice...</option>
                {unpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.clientName} (Balance:{" "}
                    {formatCurrency(inv.total - inv.amountPaid)})
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {selectedInvoice && (
            <div className="text-xs text-fg-muted bg-elevated rounded-lg p-3">
              Invoice Total: {formatCurrency(selectedInvoice.total)} | Paid:{" "}
              {formatCurrency(selectedInvoice.amountPaid)} | Remaining:{" "}
              {formatCurrency(
                selectedInvoice.total - selectedInvoice.amountPaid
              )}
            </div>
          )}

          <FormField label="Amount" required htmlFor="payment-amount">
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Payment Date" required htmlFor="payment-date">
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Method" htmlFor="payment-method">
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              {PAYMENT_METHODS.filter((m) => m !== "ALL").map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Reference" htmlFor="payment-reference">
            <input
              id="payment-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, transaction ID, etc."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Notes" htmlFor="payment-notes">
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

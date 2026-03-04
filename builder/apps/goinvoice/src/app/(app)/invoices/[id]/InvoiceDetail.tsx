"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import InvoiceForm from "@/app/(app)/invoices/InvoiceForm";
import { toast } from "sonner";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  terms: string | null;
  clientId: string;
  client: Client;
  items: LineItem[];
  payments: Payment[];
  estimate: { id: string; estimateNumber: string } | null;
}

interface InvoiceDetailProps {
  invoice: Invoice;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "SENT":
      return "info" as const;
    case "OVERDUE":
      return "error" as const;
    case "CANCELLED":
      return "neutral" as const;
    case "DRAFT":
    default:
      return "neutral" as const;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "OTHER", label: "Other" },
];

export default function InvoiceDetail({ invoice: initial }: InvoiceDetailProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice>(initial);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const balance = invoice.total - invoice.amountPaid;

  const refreshInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      }
    } catch {
      // Keep current data on failure
    }
  }, [invoice.id]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(
        newStatus === "SENT"
          ? "Invoice sent"
          : newStatus === "CANCELLED"
          ? "Invoice cancelled"
          : "Status updated"
      );
      await refreshInvoice();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete invoice");
      }

      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete invoice"
      );
      setDeleting(false);
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (amount > balance) {
      toast.error("Payment amount exceeds balance due");
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount,
          paymentDate,
          method: paymentMethod,
          reference: paymentReference || null,
          notes: paymentNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }

      toast.success("Payment recorded");
      setShowPaymentModal(false);
      resetPaymentForm();
      await refreshInvoice();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("BANK_TRANSFER");
    setPaymentReference("");
    setPaymentNotes("");
  };

  const openPaymentModal = () => {
    setPaymentAmount(balance.toFixed(2));
    setShowPaymentModal(true);
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
        Back to Invoices
      </Link>

      {/* Header Card */}
      <div className="bg-card border border-edge rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-fg">
                {invoice.invoiceNumber}
              </h1>
              <Badge variant={statusBadgeVariant(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-fg-secondary">
              <p className="font-medium text-fg">{invoice.client.name}</p>
              {invoice.client.email && <p>{invoice.client.email}</p>}
              {invoice.client.phone && <p>{invoice.client.phone}</p>}
              {invoice.client.address && (
                <p>
                  {invoice.client.address}
                  {invoice.client.city && `, ${invoice.client.city}`}
                  {invoice.client.state && `, ${invoice.client.state}`}
                  {invoice.client.zip && ` ${invoice.client.zip}`}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {invoice.status === "DRAFT" && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEditForm(true)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate("SENT")}
                  loading={updatingStatus}
                >
                  Send Invoice
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </Button>
              </>
            )}
            {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
              <>
                <Button size="sm" onClick={openPaymentModal}>
                  Record Payment
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusUpdate("CANCELLED")}
                  loading={updatingStatus}
                >
                  Cancel Invoice
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Dates & Totals row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-edge">
          <div>
            <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Issue Date
            </p>
            <p className="text-sm text-fg mt-1">
              {formatDate(invoice.issueDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Due Date
            </p>
            <p
              className={`text-sm mt-1 ${
                invoice.status === "OVERDUE"
                  ? "text-status-red-fg font-medium"
                  : "text-fg"
              }`}
            >
              {formatDate(invoice.dueDate)}
            </p>
          </div>
          {invoice.paidDate && (
            <div>
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                Paid Date
              </p>
              <p className="text-sm text-status-green-fg mt-1">
                {formatDate(invoice.paidDate)}
              </p>
            </div>
          )}
          {invoice.estimate && (
            <div>
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                From Estimate
              </p>
              <Link
                href={`/estimates/${invoice.estimate.id}`}
                className="text-sm text-accent-fg hover:underline mt-1 inline-block"
              >
                {invoice.estimate.estimateNumber}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-card border border-edge rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-fg">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-elevated text-fg-muted">
                <th className="text-left px-6 py-3 font-medium">Description</th>
                <th className="text-right px-6 py-3 font-medium w-24">Qty</th>
                <th className="text-right px-6 py-3 font-medium w-32">
                  Unit Price
                </th>
                <th className="text-right px-6 py-3 font-medium w-32">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3 text-fg">{item.description}</td>
                  <td className="px-6 py-3 text-right text-fg-secondary tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-3 text-right text-fg-secondary tabular-nums">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-6 py-3 text-right text-fg font-medium tabular-nums">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-edge px-6 py-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-fg-secondary">Subtotal</span>
                <span className="text-fg tabular-nums">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">
                    Tax ({invoice.taxRate}%)
                  </span>
                  <span className="text-fg tabular-nums">
                    {formatCurrency(invoice.taxAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t border-edge pt-2">
                <span className="text-fg">Total</span>
                <span className="text-fg tabular-nums">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-secondary">Amount Paid</span>
                    <span className="text-status-green-fg tabular-nums">
                      -{formatCurrency(invoice.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-edge pt-2">
                    <span className="text-fg">Balance Due</span>
                    <span
                      className={`tabular-nums ${
                        balance > 0 ? "text-fg" : "text-status-green-fg"
                      }`}
                    >
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(invoice.notes || invoice.terms) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {invoice.notes && (
            <div className="bg-card border border-edge rounded-xl p-6">
              <h3 className="text-sm font-semibold text-fg mb-2">Notes</h3>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.terms && (
            <div className="bg-card border border-edge rounded-xl p-6">
              <h3 className="text-sm font-semibold text-fg mb-2">Terms</h3>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-edge">
            <h2 className="text-base font-semibold text-fg">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-elevated text-fg-muted">
                  <th className="text-left px-6 py-3 font-medium">Date</th>
                  <th className="text-left px-6 py-3 font-medium">Method</th>
                  <th className="text-left px-6 py-3 font-medium">Reference</th>
                  <th className="text-left px-6 py-3 font-medium">Notes</th>
                  <th className="text-right px-6 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-3 text-fg">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-3 text-fg-secondary">
                      {PAYMENT_METHODS.find((m) => m.value === payment.method)
                        ?.label || payment.method}
                    </td>
                    <td className="px-6 py-3 text-fg-secondary">
                      {payment.reference || "-"}
                    </td>
                    <td className="px-6 py-3 text-fg-secondary">
                      {payment.notes || "-"}
                    </td>
                    <td className="px-6 py-3 text-right text-status-green-fg font-medium tabular-nums">
                      +{formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />

      {/* Record Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          resetPaymentForm();
        }}
        title="Record Payment"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-elevated rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-fg-secondary">Invoice Total</span>
              <span className="text-fg font-medium tabular-nums">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-fg-secondary">Balance Due</span>
              <span className="text-fg font-semibold tabular-nums">
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          <FormField label="Payment Amount" required>
            <input
              type="number"
              min="0.01"
              max={balance}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </FormField>

          <FormField label="Payment Date">
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label="Payment Method">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Reference">
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Check number, transaction ID, etc."
              className={inputClass}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-edge">
          <Button
            variant="secondary"
            onClick={() => {
              setShowPaymentModal(false);
              resetPaymentForm();
            }}
            disabled={savingPayment}
          >
            Cancel
          </Button>
          <Button onClick={handleRecordPayment} loading={savingPayment}>
            Record Payment
          </Button>
        </div>
      </Modal>

      {/* Edit Invoice Modal */}
      <InvoiceForm
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSaved={refreshInvoice}
        invoice={{
          id: invoice.id,
          clientId: invoice.clientId,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          taxRate: invoice.taxRate,
          notes: invoice.notes || "",
          terms: invoice.terms || "",
          items: invoice.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        }}
      />
    </div>
  );
}

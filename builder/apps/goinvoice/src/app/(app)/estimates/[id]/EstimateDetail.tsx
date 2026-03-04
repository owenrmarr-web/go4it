"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DocumentIcon, ReceiptIcon } from "@/components/Icons";

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface LinkedInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
}

interface EstimateData {
  id: string;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiresAt: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  items: EstimateItem[];
  invoices: LinkedInvoice[];
}

interface EstimateDetailProps {
  initialEstimate: EstimateData;
}

const STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "error" | "warning" | "neutral"> = {
  ACCEPTED: "success",
  SENT: "info",
  DECLINED: "error",
  EXPIRED: "warning",
  DRAFT: "neutral",
};

const INVOICE_STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "error" | "warning" | "neutral"> = {
  PAID: "success",
  SENT: "info",
  OVERDUE: "error",
  DRAFT: "neutral",
  PARTIAL: "warning",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function EstimateDetail({ initialEstimate }: EstimateDetailProps) {
  const router = useRouter();
  const [estimate, setEstimate] = useState(initialEstimate);
  const [sendingAction, setSendingAction] = useState<string | null>(null);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  async function updateStatus(newStatus: string) {
    setSendingAction(newStatus);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      setEstimate((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Estimate marked as ${newStatus.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSendingAction(null);
    }
  }

  async function handleConvert() {
    setSendingAction("CONVERT");
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/convert`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to convert to invoice");
      }

      const invoice = await res.json();
      toast.success(`Invoice ${invoice.invoiceNumber} created`);
      setEstimate((prev) => ({
        ...prev,
        status: "ACCEPTED",
        invoices: [
          ...prev.invoices,
          {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: invoice.total,
          },
        ],
      }));
      setShowConvertConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setSendingAction(null);
    }
  }

  function handleDecline() {
    setShowDeclineConfirm(false);
    updateStatus("DECLINED");
  }

  const clientAddress = [
    estimate.client.address,
    [estimate.client.city, estimate.client.state].filter(Boolean).join(", "),
    estimate.client.zip,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div>
      <PageHeader
        title={estimate.estimateNumber}
        subtitle="Estimate details"
        action={
          <Button variant="secondary" onClick={() => router.push("/estimates")}>
            Back to Estimates
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Info Header */}
          <div className="bg-card rounded-xl border border-edge p-6">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Badge variant={STATUS_BADGE_VARIANT[estimate.status] || "neutral"}>
                {estimate.status}
              </Badge>
              <span className="text-sm text-fg-muted">
                Issued {formatDate(estimate.issueDate)}
              </span>
              {estimate.expiresAt && (
                <span className="text-sm text-fg-muted">
                  Expires {formatDate(estimate.expiresAt)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {(estimate.status === "DRAFT") && (
                <Button
                  onClick={() => updateStatus("SENT")}
                  loading={sendingAction === "SENT"}
                  disabled={!!sendingAction}
                >
                  Send Estimate
                </Button>
              )}

              {(estimate.status === "DRAFT" || estimate.status === "SENT") && (
                <Button
                  variant="secondary"
                  onClick={() => setShowConvertConfirm(true)}
                  disabled={!!sendingAction}
                >
                  <ReceiptIcon className="w-4 h-4" />
                  Convert to Invoice
                </Button>
              )}

              {(estimate.status === "SENT") && (
                <Button
                  variant="ghost"
                  onClick={() => setShowDeclineConfirm(true)}
                  disabled={!!sendingAction}
                >
                  Mark Declined
                </Button>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-card rounded-xl border border-edge overflow-hidden">
            <div className="px-6 py-4 border-b border-edge">
              <h2 className="text-base font-semibold text-fg">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left font-medium text-fg-muted px-6 py-3">
                      Description
                    </th>
                    <th className="text-right font-medium text-fg-muted px-6 py-3">
                      Qty
                    </th>
                    <th className="text-right font-medium text-fg-muted px-6 py-3">
                      Unit Price
                    </th>
                    <th className="text-right font-medium text-fg-muted px-6 py-3">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-edge last:border-b-0"
                    >
                      <td className="px-6 py-3 text-fg">{item.description}</td>
                      <td className="px-6 py-3 text-right text-fg-secondary">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-3 text-right text-fg-secondary">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-fg">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-edge px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm text-fg-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(estimate.subtotal)}</span>
              </div>
              {estimate.taxRate > 0 && (
                <div className="flex justify-between text-sm text-fg-secondary">
                  <span>Tax ({estimate.taxRate}%)</span>
                  <span>{formatCurrency(estimate.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-fg pt-2 border-t border-edge">
                <span>Total</span>
                <span>{formatCurrency(estimate.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="bg-card rounded-xl border border-edge p-6">
              <h2 className="text-base font-semibold text-fg mb-2">Notes</h2>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">
                {estimate.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-card rounded-xl border border-edge p-6">
            <h2 className="text-base font-semibold text-fg mb-4">Client</h2>
            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">
                {estimate.client.name}
              </p>
              {estimate.client.email && (
                <p className="text-sm text-fg-secondary">
                  {estimate.client.email}
                </p>
              )}
              {estimate.client.phone && (
                <p className="text-sm text-fg-secondary">
                  {estimate.client.phone}
                </p>
              )}
              {clientAddress && (
                <p className="text-sm text-fg-muted whitespace-pre-line">
                  {clientAddress}
                </p>
              )}
            </div>
          </div>

          {/* Linked Invoices */}
          {estimate.invoices.length > 0 && (
            <div className="bg-card rounded-xl border border-edge p-6">
              <h2 className="text-base font-semibold text-fg mb-4">
                Linked Invoices
              </h2>
              <div className="space-y-3">
                {estimate.invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-edge hover:bg-hover transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <DocumentIcon className="w-4 h-4 text-fg-muted" />
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {formatCurrency(inv.total)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        INVOICE_STATUS_BADGE_VARIANT[inv.status] || "neutral"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decline Confirmation */}
      <ConfirmDialog
        open={showDeclineConfirm}
        onClose={() => setShowDeclineConfirm(false)}
        onConfirm={handleDecline}
        title="Decline Estimate"
        message="Are you sure you want to mark this estimate as declined? This action can be undone by changing the status later."
        confirmLabel="Mark Declined"
        destructive
        loading={sendingAction === "DECLINED"}
      />

      {/* Convert Confirmation */}
      <ConfirmDialog
        open={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={handleConvert}
        title="Convert to Invoice"
        message={`This will create a new invoice from estimate ${estimate.estimateNumber} and mark the estimate as accepted. Continue?`}
        confirmLabel="Convert to Invoice"
        loading={sendingAction === "CONVERT"}
      />
    </div>
  );
}

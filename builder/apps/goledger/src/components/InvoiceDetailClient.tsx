"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import InvoicePreview from "./InvoicePreview";
import Modal from "./Modal";
import PaymentForm from "./PaymentForm";
import ConfirmDialog from "./ConfirmDialog";
import StatusBadge from "./StatusBadge";
import Link from "next/link";

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  date: string;
  notes: string | null;
  client: { name: string };
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface ClientData {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discountType: string | null;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  memo: string | null;
  poNumber: string | null;
  viewToken: string;
  client: ClientData;
  lineItems: LineItem[];
  payments: Payment[];
  category: { name: string } | null;
}

interface BusinessSettingsData {
  businessName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  email: string | null;
  phone: string | null;
}

interface InvoiceDetailClientProps {
  invoice: InvoiceData;
  businessSettings: BusinessSettingsData | null;
}

export default function InvoiceDetailClient({ invoice, businessSettings }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const balanceDue = invoice.total - invoice.amountPaid;
  const canRecordPayment = ["SENT", "VIEWED", "PARTIAL", "OVERDUE"].includes(invoice.status);
  const canSend = invoice.status === "DRAFT";
  const canEdit = invoice.status === "DRAFT";
  const canVoid = !["PAID", "VOID"].includes(invoice.status);
  const canRemind = invoice.status === "OVERDUE" ||
    (["SENT", "VIEWED", "PARTIAL"].includes(invoice.status) && new Date(invoice.dueDate) < new Date());

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send invoice");
      toast.success("Invoice sent");
      router.refresh();
    } catch {
      toast.error("Failed to send invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to duplicate invoice");
      const data = await res.json();
      toast.success("Invoice duplicated");
      router.push(`/invoices/${data.id}`);
    } catch {
      toast.error("Failed to duplicate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/void`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to void invoice");
      toast.success("Invoice voided");
      router.refresh();
    } catch {
      toast.error("Failed to void invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/remind`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reminder");
      }
      toast.success("Payment reminder sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentLink = () => {
    const link = `${window.location.origin}/pay/${invoice.viewToken}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied");
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</h1>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {canEdit && (
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
          >
            Edit
          </Link>
        )}
        {canSend && (
          <button
            onClick={handleSend}
            disabled={loading}
            className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm disabled:opacity-50"
          >
            Send
          </button>
        )}
        {canRecordPayment && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm"
          >
            Record Payment
          </button>
        )}
        {canRemind && (
          <button
            onClick={handleSendReminder}
            disabled={loading}
            className="bg-amber-50 text-amber-700 py-2 px-4 rounded-lg hover:bg-amber-100 text-sm font-medium disabled:opacity-50"
          >
            Send Reminder
          </button>
        )}
        <button
          onClick={handleDuplicate}
          disabled={loading}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium disabled:opacity-50"
        >
          Duplicate
        </button>
        <Link
          href={`/invoices/${invoice.id}/pdf`}
          target="_blank"
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
        >
          PDF
        </Link>
        <button
          onClick={copyPaymentLink}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
        >
          Copy Payment Link
        </button>
        {canVoid && (
          <button
            onClick={() => setShowVoidConfirm(true)}
            className="bg-red-50 text-red-600 py-2 px-4 rounded-lg hover:bg-red-100 text-sm font-medium"
          >
            Void
          </button>
        )}
      </div>

      {/* Invoice Preview */}
      <InvoicePreview
        invoice={{
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          clientName: invoice.client.name,
          clientEmail: invoice.client.email ?? undefined,
          clientAddress: invoice.client.address ?? undefined,
          clientCity: invoice.client.city ?? undefined,
          clientState: invoice.client.state ?? undefined,
          clientZip: invoice.client.zip ?? undefined,
          lineItems: invoice.lineItems,
          subtotal: invoice.subtotal,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          discountAmount: invoice.discountAmount,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          amountPaid: invoice.amountPaid,
          memo: invoice.memo ?? undefined,
          businessName: businessSettings?.businessName,
          businessAddress: businessSettings?.address ?? undefined,
          businessCity: businessSettings?.city ?? undefined,
          businessState: businessSettings?.state ?? undefined,
          businessZip: businessSettings?.zip ?? undefined,
          businessEmail: businessSettings?.email ?? undefined,
          businessPhone: businessSettings?.phone ?? undefined,
        }}
      />

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment History</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Method</th>
                <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Reference</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 text-gray-700 dark:text-gray-300">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300 font-medium">${payment.amount.toFixed(2)}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">{payment.method.replace("_", " ")}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">{payment.reference || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
        <PaymentForm
          invoiceId={invoice.id}
          clientId={invoice.client.id}
          balanceDue={balanceDue}
          onSuccess={() => {
            setShowPaymentModal(false);
            router.refresh();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      </Modal>

      {/* Void Confirm */}
      <ConfirmDialog
        isOpen={showVoidConfirm}
        onClose={() => setShowVoidConfirm(false)}
        onConfirm={handleVoid}
        title="Void Invoice"
        message="Are you sure you want to void this invoice? This action cannot be undone."
        confirmLabel="Void Invoice"
        destructive
      />
    </div>
  );
}

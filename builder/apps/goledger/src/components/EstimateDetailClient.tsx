"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import InvoicePreview from "./InvoicePreview";
import ConfirmDialog from "./ConfirmDialog";
import StatusBadge from "./StatusBadge";
import Link from "next/link";

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
  memo: string | null;
  convertedInvoiceId: string | null;
  client: ClientData;
  lineItems: LineItem[];
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

interface EstimateDetailClientProps {
  estimate: EstimateData;
  businessSettings: BusinessSettingsData | null;
}

export default function EstimateDetailClient({ estimate, businessSettings }: EstimateDetailClientProps) {
  const router = useRouter();
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = estimate.status === "DRAFT";
  const canSend = estimate.status === "DRAFT";
  const canConvert = ["SENT", "ACCEPTED"].includes(estimate.status) && !estimate.convertedInvoiceId;

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send");
      toast.success("Estimate sent");
      router.refresh();
    } catch {
      toast.error("Failed to send estimate");
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to convert");
      const data = await res.json();
      toast.success("Converted to invoice");
      router.push(`/invoices/${data.invoiceId}`);
    } catch {
      toast.error("Failed to convert to invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/estimates" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{estimate.estimateNumber}</h1>
          <StatusBadge status={estimate.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {canEdit && (
          <Link
            href={`/estimates/${estimate.id}/edit`}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
          >
            Edit
          </Link>
        )}
        {canSend && (
          <button onClick={handleSend} disabled={loading} className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
            Send
          </button>
        )}
        {canConvert && (
          <button onClick={() => setShowConvertConfirm(true)} disabled={loading} className="gradient-brand text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
            Convert to Invoice
          </button>
        )}
        {estimate.convertedInvoiceId && (
          <Link
            href={`/invoices/${estimate.convertedInvoiceId}`}
            className="bg-purple-50 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-100 text-sm font-medium"
          >
            View Invoice
          </Link>
        )}
      </div>

      <InvoicePreview
        invoice={{
          invoiceNumber: estimate.estimateNumber,
          status: estimate.status,
          issueDate: estimate.issueDate,
          dueDate: estimate.expiresAt ?? estimate.issueDate,
          clientName: estimate.client.name,
          clientEmail: estimate.client.email ?? undefined,
          clientAddress: estimate.client.address ?? undefined,
          clientCity: estimate.client.city ?? undefined,
          clientState: estimate.client.state ?? undefined,
          clientZip: estimate.client.zip ?? undefined,
          lineItems: estimate.lineItems,
          subtotal: estimate.subtotal,
          taxRate: estimate.taxRate,
          taxAmount: estimate.taxAmount,
          total: estimate.total,
          amountPaid: 0,
          memo: estimate.memo ?? undefined,
          businessName: businessSettings?.businessName,
          businessAddress: businessSettings?.address ?? undefined,
          businessCity: businessSettings?.city ?? undefined,
          businessState: businessSettings?.state ?? undefined,
          businessZip: businessSettings?.zip ?? undefined,
          businessEmail: businessSettings?.email ?? undefined,
          businessPhone: businessSettings?.phone ?? undefined,
        }}
      />

      <ConfirmDialog
        isOpen={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={handleConvert}
        title="Convert to Invoice"
        message="This will create a new invoice from this estimate. The estimate will be marked as converted."
        confirmLabel="Convert"
      />
    </div>
  );
}

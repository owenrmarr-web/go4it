"use client";

import { useState } from "react";
import { toast } from "sonner";
import InvoicePreview from "./InvoicePreview";
import StripePaymentForm from "./StripePaymentForm";

interface PayInvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientState: string | null;
  clientZip: string | null;
  lineItems: { description: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  memo: string | null;
  businessName: string;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZip: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  paymentInstructions: string | null;
  stripeConfigured: boolean;
}

interface PayPageClientProps {
  invoice: PayInvoiceData;
  token: string;
}

export default function PayPageClient({ invoice, token }: PayPageClientProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [paid, setPaid] = useState(invoice.status === "PAID");

  const balanceDue = invoice.total - invoice.amountPaid;
  const fullyPaid = balanceDue <= 0 || paid;

  const initiateStripePayment = async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch(`/api/pay/${token}/payment-intent`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create payment intent");
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPublishableKey(data.publishableKey);
    } catch {
      toast.error("Failed to initialize payment");
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      await fetch(`/api/pay/${token}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });
      setPaid(true);
      toast.success("Payment successful!");
    } catch {
      toast.error("Payment recorded but confirmation failed. Please contact the business.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Branded header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-brand-text">{invoice.businessName}</h1>
          <p className="text-gray-500 mt-1">Invoice {invoice.invoiceNumber}</p>
        </div>

        {/* Paid state */}
        {fullyPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-8">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-bold text-green-700">Paid in Full</h2>
            <p className="text-sm text-green-600 mt-1">Thank you for your payment!</p>
          </div>
        )}

        {/* Invoice Preview */}
        <InvoicePreview
          invoice={{
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail ?? undefined,
            clientAddress: invoice.clientAddress ?? undefined,
            clientCity: invoice.clientCity ?? undefined,
            clientState: invoice.clientState ?? undefined,
            clientZip: invoice.clientZip ?? undefined,
            lineItems: invoice.lineItems,
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            amountPaid: invoice.amountPaid,
            memo: invoice.memo ?? undefined,
            businessName: invoice.businessName,
            businessAddress: invoice.businessAddress ?? undefined,
            businessCity: invoice.businessCity ?? undefined,
            businessState: invoice.businessState ?? undefined,
            businessZip: invoice.businessZip ?? undefined,
            businessEmail: invoice.businessEmail ?? undefined,
            businessPhone: invoice.businessPhone ?? undefined,
          }}
        />

        {/* Payment section */}
        {!fullyPaid && (
          <div className="mt-8 space-y-6">
            {/* Stripe Pay Now */}
            {invoice.stripeConfigured && !clientSecret && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Pay Online</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Balance due: <span className="font-bold text-gray-900">${balanceDue.toFixed(2)}</span>
                </p>
                <button
                  onClick={initiateStripePayment}
                  disabled={loadingStripe}
                  className="gradient-brand text-white font-semibold py-3 px-8 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {loadingStripe ? "Loading..." : "Pay Now"}
                </button>
              </div>
            )}

            {/* Stripe form */}
            {clientSecret && publishableKey && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
                <StripePaymentForm
                  clientSecret={clientSecret}
                  publishableKey={publishableKey}
                  onSuccess={handleStripeSuccess}
                />
              </div>
            )}

            {/* Payment Instructions */}
            {invoice.paymentInstructions && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Instructions</h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.paymentInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          Powered by <span className="gradient-brand-text font-bold">GoLedger</span>
        </div>
      </div>
    </div>
  );
}

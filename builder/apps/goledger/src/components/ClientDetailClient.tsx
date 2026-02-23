"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountPaid: number;
  issueDate: string;
}

interface PaymentSummary {
  id: string;
  amount: number;
  method: string;
  date: string;
  invoice: { invoiceNumber: string };
}

interface ExpenseSummary {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  role: string;
  contactName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  paymentTerms: string | null;
  notes: string | null;
  invoices: InvoiceSummary[];
  payments: PaymentSummary[];
  expenses: ExpenseSummary[];
}

interface ClientDetailClientProps {
  client: ClientData;
}

export default function ClientDetailClient({ client }: ClientDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "expenses">("invoices");

  const outstandingBalance = client.invoices
    .filter((inv) => !["PAID", "VOID", "DRAFT"].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);

  const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = client.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.name}</h1>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">{client.role}</span>
        </div>
        <Link
          href={`/clients/${client.id}/edit`}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
        >
          Edit
        </Link>
      </div>

      {/* Contact Info + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Contact Info</h3>
          <div className="space-y-2 text-sm">
            {client.email && <p className="text-gray-700 dark:text-gray-300">{client.email}</p>}
            {client.phone && <p className="text-gray-700 dark:text-gray-300">{client.phone}</p>}
            {client.contactName && <p className="text-gray-500 dark:text-gray-400">Contact: {client.contactName}</p>}
            {client.address && (
              <p className="text-gray-500 dark:text-gray-400">
                {client.address}
                {client.city && `, ${client.city}`}
                {client.state && `, ${client.state}`}
                {client.zip && ` ${client.zip}`}
              </p>
            )}
            {!client.email && !client.phone && <p className="text-gray-400 dark:text-gray-500">No contact info</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Outstanding Balance</h3>
          <p className={`text-2xl font-bold ${outstandingBalance > 0 ? "text-amber-600" : "text-green-600"}`}>
            ${outstandingBalance.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{client.invoices.length} total invoices</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Paid</h3>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{client.payments.length} payments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6 w-fit">
        {(["invoices", "payments", "expenses"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {activeTab === "invoices" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Total</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Balance</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {client.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-4">
                    <Link href={`/invoices/${inv.id}`} className="text-purple-600 hover:text-purple-700 font-medium">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">${inv.total.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">${(inv.total - inv.amountPaid).toFixed(2)}</td>
                  <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
              {client.invoices.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No invoices</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "payments" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Method</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {client.payments.map((pay) => (
                <tr key={pay.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(pay.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{pay.invoice.invoiceNumber}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{pay.method.replace("_", " ")}</td>
                  <td className="py-3 px-4 text-right font-medium text-green-600">${pay.amount.toFixed(2)}</td>
                </tr>
              ))}
              {client.payments.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No payments</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "expenses" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {client.expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{exp.description}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-700 dark:text-gray-300">${exp.amount.toFixed(2)}</td>
                </tr>
              ))}
              {client.expenses.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No expenses</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {client.notes && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  );
}

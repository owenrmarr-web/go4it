"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { ReceiptIcon, PlusIcon } from "@/components/Icons";
import InvoiceForm from "./InvoiceForm";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  client: { name: string };
}

interface InvoiceListProps {
  initialInvoices: Invoice[];
}

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

function statusBadgeVariant(status: string) {
  switch (status) {
    case "PAID":
      return "success";
    case "SENT":
      return "info";
    case "OVERDUE":
      return "error";
    case "CANCELLED":
      return "neutral";
    case "DRAFT":
    default:
      return "neutral";
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

export default function InvoiceList({ initialInvoices }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showForm, setShowForm] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      // Silently fail, keep current data
    }
  }, []);

  const filtered = useMemo(() => {
    let result = invoices;

    if (activeTab !== "ALL") {
      result = result.filter((inv) => inv.status === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.client.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [invoices, activeTab, search]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: invoices.length };
    for (const inv of invoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return counts;
  }, [invoices]);

  const isOverdue = (inv: Invoice) => inv.status === "OVERDUE";

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Manage and track your invoices"
        action={
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="w-4 h-4" />
            New Invoice
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-elevated p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? "bg-card text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {tab.label}
              {(tabCounts[tab.value] ?? 0) > 0 && (
                <span className="ml-1.5 text-xs text-fg-muted">
                  {tabCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoices..."
          className="w-full sm:w-64"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon />}
          message={
            search || activeTab !== "ALL"
              ? "No invoices found"
              : "No invoices yet"
          }
          description={
            search || activeTab !== "ALL"
              ? "Try adjusting your search or filter."
              : "Create your first invoice to get started."
          }
          actionLabel={
            !search && activeTab === "ALL" ? "New Invoice" : undefined
          }
          onAction={
            !search && activeTab === "ALL" ? () => setShowForm(true) : undefined
          }
        />
      ) : (
        <div className="border border-edge rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-elevated text-fg-muted">
                  <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Issue Date</th>
                  <th className="text-left px-4 py-3 font-medium">Due Date</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-right px-4 py-3 font-medium">Paid</th>
                  <th className="text-right px-4 py-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {filtered.map((inv) => {
                  const balance = inv.total - inv.amountPaid;
                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors hover:bg-hover ${
                        isOverdue(inv) ? "bg-status-red/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-accent-fg hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-fg">{inv.client.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(inv.status)}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          isOverdue(inv)
                            ? "text-status-red-fg font-medium"
                            : "text-fg-secondary"
                        }`}
                      >
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-fg font-medium tabular-nums">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-fg-secondary tabular-nums">
                        {formatCurrency(inv.amountPaid)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${
                          balance > 0 ? "text-fg" : "text-status-green-fg"
                        }`}
                      >
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      <InvoiceForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetchInvoices}
      />
    </div>
  );
}

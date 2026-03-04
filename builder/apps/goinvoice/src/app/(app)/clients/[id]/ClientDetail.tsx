"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import {
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ReceiptIcon,
  DocumentIcon,
} from "@/components/Icons";
import ClientForm from "../ClientForm";
import type { ClientSummary } from "../ClientList";

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
}

interface EstimateSummary {
  id: string;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiresAt: string | null;
  total: number;
}

interface ClientDetailData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  invoices: InvoiceSummary[];
  estimates: EstimateSummary[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info" | "accent";

function invoiceStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PAID":
      return "success";
    case "SENT":
    case "VIEWED":
      return "info";
    case "OVERDUE":
      return "error";
    case "DRAFT":
      return "neutral";
    case "CANCELLED":
      return "warning";
    default:
      return "neutral";
  }
}

function estimateStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "SENT":
      return "info";
    case "EXPIRED":
    case "DECLINED":
      return "error";
    case "DRAFT":
      return "neutral";
    default:
      return "neutral";
  }
}

export default function ClientDetail({
  initialClient,
}: {
  initialClient: ClientDetailData;
}) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasInvoices = client.invoices.length > 0;

  // Build a ClientSummary-compatible object for ClientForm
  const clientForForm: ClientSummary = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    state: client.state,
    zip: client.zip,
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    invoiceCount: client.invoices.length,
    totalBilled: client.totalBilled,
    totalPaid: client.totalPaid,
    outstanding: client.outstanding,
  };

  async function handleSaved() {
    setEditOpen(false);
    const res = await fetch(`/api/clients/${client.id}`);
    if (res.ok) {
      const data = await res.json();
      const totalBilled = data.invoices.reduce(
        (s: number, i: { total: number }) => s + i.total,
        0
      );
      const totalPaid = data.invoices.reduce(
        (s: number, i: { amountPaid: number }) => s + i.amountPaid,
        0
      );
      const outstanding = data.invoices
        .filter((i: { status: string }) => i.status !== "CANCELLED")
        .reduce(
          (s: number, i: { total: number; amountPaid: number }) =>
            s + (i.total - i.amountPaid),
          0
        );

      setClient({
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        totalBilled,
        totalPaid,
        outstanding,
        invoices: data.invoices.map(
          (inv: {
            id: string;
            invoiceNumber: string;
            status: string;
            issueDate: string;
            dueDate: string;
            total: number;
            amountPaid: number;
          }) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            total: inv.total,
            amountPaid: inv.amountPaid,
          })
        ),
        estimates: data.estimates.map(
          (est: {
            id: string;
            estimateNumber: string;
            status: string;
            issueDate: string;
            expiresAt: string | null;
            total: number;
          }) => ({
            id: est.id,
            estimateNumber: est.estimateNumber,
            status: est.status,
            issueDate: est.issueDate,
            expiresAt: est.expiresAt,
            total: est.total,
          })
        ),
      });
    }
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete client");
        return;
      }
      toast.success("Client deleted");
      router.push("/clients");
      router.refresh();
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const addressParts = [client.address, client.city, client.state, client.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle="Client details"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <PencilIcon className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <TrashIcon className="w-4 h-4" />
              Delete
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-edge p-4">
          <p className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-1">
            Total Billed
          </p>
          <p className="text-xl font-bold text-fg">
            {formatCurrency(client.totalBilled)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-4">
          <p className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-1">
            Total Paid
          </p>
          <p className="text-xl font-bold text-fg">
            {formatCurrency(client.totalPaid)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-4">
          <p className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-1">
            Outstanding
          </p>
          <p className="text-xl font-bold text-fg">
            {formatCurrency(client.outstanding)}
          </p>
        </div>
      </div>

      {/* Client info card */}
      <div className="bg-card rounded-xl border border-edge p-5 mb-6">
        <h2 className="text-base font-semibold text-fg mb-4">
          Contact Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {client.email && (
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-4 h-4 text-fg-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-fg-muted">Email</p>
                <p className="text-sm text-fg">{client.email}</p>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-4 h-4 text-fg-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-fg-muted">Phone</p>
                <p className="text-sm text-fg">{client.phone}</p>
              </div>
            </div>
          )}
          {addressParts && (
            <div className="flex items-center gap-3 sm:col-span-2">
              <MapPinIcon className="w-4 h-4 text-fg-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-fg-muted">Address</p>
                <p className="text-sm text-fg">{addressParts}</p>
              </div>
            </div>
          )}
          {!client.email && !client.phone && !addressParts && (
            <p className="text-sm text-fg-muted sm:col-span-2">
              No contact information on file.
            </p>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-edge">
            <p className="text-xs text-fg-muted mb-1">Notes</p>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {/* Invoice history */}
      <div className="bg-card rounded-xl border border-edge overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4" />
            Invoices
            <span className="text-fg-muted font-normal text-sm">
              ({client.invoices.length})
            </span>
          </h2>
        </div>
        {client.invoices.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon />}
            message="No invoices"
            description="No invoices have been created for this client yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Invoice #
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Due Date
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-fg-secondary">
                    Total
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-fg-secondary">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {client.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-edge last:border-b-0 hover:bg-hover cursor-pointer transition-colors"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-fg">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={invoiceStatusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-3 text-right text-fg-secondary">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-5 py-3 text-right text-fg-secondary">
                      {formatCurrency(inv.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estimate history */}
      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <div className="px-5 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <DocumentIcon className="w-4 h-4" />
            Estimates
            <span className="text-fg-muted font-normal text-sm">
              ({client.estimates.length})
            </span>
          </h2>
        </div>
        {client.estimates.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon />}
            message="No estimates"
            description="No estimates have been created for this client yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Estimate #
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-fg-secondary">
                    Expires
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-fg-secondary">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {client.estimates.map((est) => (
                  <tr
                    key={est.id}
                    className="border-b border-edge last:border-b-0 hover:bg-hover cursor-pointer transition-colors"
                    onClick={() => router.push(`/estimates/${est.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-fg">
                      {est.estimateNumber}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={estimateStatusVariant(est.status)}>
                        {est.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      {formatDate(est.issueDate)}
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      {est.expiresAt ? formatDate(est.expiresAt) : "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-right text-fg-secondary">
                      {formatCurrency(est.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClientForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
        client={clientForForm}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={
          hasInvoices
            ? `"${client.name}" has ${client.invoices.length} invoice${client.invoices.length !== 1 ? "s" : ""}. You must delete or reassign all invoices before deleting this client.`
            : `Are you sure you want to delete "${client.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}

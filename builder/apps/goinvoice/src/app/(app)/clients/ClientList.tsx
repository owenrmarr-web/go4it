"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PlusIcon, UsersIcon } from "@/components/Icons";
import ClientForm from "./ClientForm";

export interface ClientSummary {
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
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ClientList({
  initialClients,
}: {
  initialClients: ClientSummary[];
}) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>(initialClients);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<ClientSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  async function handleSaved() {
    setFormOpen(false);
    setEditingClient(null);
    const res = await fetch("/api/clients");
    if (res.ok) {
      const data = await res.json();
      setClients(data);
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete client");
        return;
      }
      toast.success("Client deleted");
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      router.refresh();
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setFormOpen(true)}>
            <PlusIcon className="w-4 h-4" />
            New Client
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          message="No clients yet"
          description="Add your first client to start creating invoices and estimates."
          actionLabel="New Client"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          <div className="mb-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email..."
              className="max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-fg-muted text-sm">
                No clients match your search.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-edge overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-edge">
                      <th className="text-left px-4 py-3 font-medium text-fg-secondary">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-fg-secondary">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-fg-secondary">
                        Phone
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-fg-secondary">
                        Invoices
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-fg-secondary">
                        Billed
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-fg-secondary">
                        Paid
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-fg-secondary">
                        Outstanding
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b border-edge last:border-b-0 hover:bg-hover cursor-pointer transition-colors"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-fg">
                          {client.name}
                        </td>
                        <td className="px-4 py-3 text-fg-secondary">
                          {client.email || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-fg-secondary">
                          {client.phone || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-right text-fg-secondary">
                          {client.invoiceCount}
                        </td>
                        <td className="px-4 py-3 text-right text-fg-secondary">
                          {formatCurrency(client.totalBilled)}
                        </td>
                        <td className="px-4 py-3 text-right text-fg-secondary">
                          {formatCurrency(client.totalPaid)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-fg">
                          {formatCurrency(client.outstanding)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingClient(client);
                              }}
                              className="p-1 rounded-lg hover:bg-hover text-fg-muted hover:text-fg transition-colors"
                              aria-label="Edit client"
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
                                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(client);
                              }}
                              className="p-1 rounded-lg hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors"
                              aria-label="Delete client"
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
                                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ClientForm
        open={formOpen || !!editingClient}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
        }}
        onSaved={handleSaved}
        client={editingClient}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={
          deleteTarget && deleteTarget.invoiceCount > 0
            ? `"${deleteTarget.name}" has ${deleteTarget.invoiceCount} invoice${deleteTarget.invoiceCount !== 1 ? "s" : ""}. You must delete or reassign all invoices before deleting this client.`
            : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}

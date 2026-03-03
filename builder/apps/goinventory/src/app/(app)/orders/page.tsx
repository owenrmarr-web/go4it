"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { ReceiptIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  totalAmount: number;
  supplier: { name: string };
  _count: { items: number };
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "In Progress", value: "PARTIALLY_RECEIVED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/orders?${params}`);
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/orders/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Order deleted");
      setDeleteTarget(null);
      fetchOrders();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete");
    }
  };

  const orderStatusBadge = (status: string) => {
    const variants: Record<string, "neutral" | "info" | "warning" | "success" | "error"> = {
      DRAFT: "neutral",
      SUBMITTED: "info",
      PARTIALLY_RECEIVED: "warning",
      RECEIVED: "success",
      CANCELLED: "error",
    };
    return variants[status] || "neutral";
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Purchase Orders"
        action={
          <Link href="/orders/new">
            <Button>New Order</Button>
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === tab.value ? "bg-accent text-white" : "bg-elevated text-fg-secondary hover:bg-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-fg-muted text-sm py-8 text-center">Loading...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon />}
          message="No purchase orders yet"
          description="Create a purchase order to start ordering from suppliers."
          actionLabel="New Order"
          onAction={() => window.location.href = "/orders/new"}
        />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Order #</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Order Date</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Expected</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Items</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Total</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-edge hover:bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="text-accent-fg hover:underline font-medium">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">{o.supplier.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={orderStatusBadge(o.status)}>{o.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{o._count.items}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${o.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status === "DRAFT" && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(o)}>
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Order"
        message="Are you sure you want to delete this draft order? This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { use } from "react";

interface OrderItem {
  id: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  product: { id: string; name: string; sku: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  totalAmount: number;
  supplier: { id: string; name: string };
  items: OrderItem[];
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Order ${newStatus.toLowerCase()}`);
      fetchOrder();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to update status");
    }
  };

  const openReceive = () => {
    if (!order) return;
    const initial: Record<string, number> = {};
    order.items.forEach((item) => {
      initial[item.id] = item.receivedQuantity;
    });
    setReceiveItems(initial);
    setShowReceive(true);
  };

  const handleReceive = async () => {
    setReceiving(true);
    const items = Object.entries(receiveItems).map(([itemId, receivedQuantity]) => ({
      itemId,
      receivedQuantity,
    }));

    const res = await fetch(`/api/orders/${id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (res.ok) {
      toast.success("Items received successfully");
      setShowReceive(false);
      fetchOrder();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to receive items");
    }
    setReceiving(false);
  };

  const handleCancel = async () => {
    await handleStatusChange("CANCELLED");
    setShowCancel(false);
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Order deleted");
      router.push("/orders");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete");
    }
    setShowDelete(false);
  };

  const statusBadgeVariant = (status: string) => {
    const variants: Record<string, "neutral" | "info" | "warning" | "success" | "error"> = {
      DRAFT: "neutral",
      SUBMITTED: "info",
      PARTIALLY_RECEIVED: "warning",
      RECEIVED: "success",
      CANCELLED: "error",
    };
    return variants[status] || "neutral";
  };

  if (loading) {
    return <div className=""><p className="text-fg-muted">Loading...</p></div>;
  }

  if (!order) {
    return <div className=""><p className="text-fg-muted">Order not found</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.orderNumber}
        action={
          <Link href="/orders">
            <Button variant="secondary">Back to Orders</Button>
          </Link>
        }
      />

      {/* Order Header */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge variant={statusBadgeVariant(order.status)}>
            {order.status.replace("_", " ")}
          </Badge>

          {order.status === "DRAFT" && (
            <>
              <Button size="sm" onClick={() => handleStatusChange("SUBMITTED")}>
                Submit Order
              </Button>
              <Button size="sm" variant="danger" onClick={() => setShowCancel(true)}>
                Cancel
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDelete(true)}>
                Delete
              </Button>
            </>
          )}

          {order.status === "SUBMITTED" && (
            <>
              <Button size="sm" onClick={openReceive}>
                Receive Items
              </Button>
              <Button size="sm" variant="danger" onClick={() => setShowCancel(true)}>
                Cancel
              </Button>
            </>
          )}

          {order.status === "PARTIALLY_RECEIVED" && (
            <Button size="sm" onClick={openReceive}>
              Receive More Items
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-fg-muted">Supplier</span>
            <p className="text-fg mt-0.5">
              <Link href={`/suppliers/${order.supplier.id}`} className="text-accent-fg hover:underline">
                {order.supplier.name}
              </Link>
            </p>
          </div>
          <div>
            <span className="text-fg-muted">Order Date</span>
            <p className="text-fg mt-0.5">{new Date(order.orderDate).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-fg-muted">Expected Delivery</span>
            <p className="text-fg mt-0.5">
              {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <span className="text-fg-muted">Received Date</span>
            <p className="text-fg mt-0.5">
              {order.receivedDate ? new Date(order.receivedDate).toLocaleDateString() : "—"}
            </p>
          </div>
          {order.notes && (
            <div className="sm:col-span-2 lg:col-span-4">
              <span className="text-fg-muted">Notes</span>
              <p className="text-fg-secondary mt-0.5">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-2 text-fg-muted font-medium">Product</th>
                <th className="text-left px-4 py-2 text-fg-muted font-medium">SKU</th>
                <th className="text-right px-4 py-2 text-fg-muted font-medium">Ordered</th>
                <th className="text-right px-4 py-2 text-fg-muted font-medium">Received</th>
                <th className="text-right px-4 py-2 text-fg-muted font-medium">Unit Price</th>
                <th className="text-right px-4 py-2 text-fg-muted font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-edge">
                  <td className="px-4 py-2">
                    <Link href={`/products/${item.product.id}`} className="text-accent-fg hover:underline">
                      {item.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-fg-muted">{item.product.sku}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={item.receivedQuantity >= item.quantity ? "text-status-green-fg" : item.receivedQuantity > 0 ? "text-status-amber-fg" : "text-fg-muted"}>
                      {item.receivedQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-semibold text-fg">
                  Order Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-fg">
                  ${order.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal */}
      <Modal open={showReceive} onClose={() => setShowReceive(false)} title="Receive Items" size="lg">
        <p className="text-sm text-fg-secondary mb-4">
          Enter the quantity received for each item.
        </p>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b border-edge">
              <div className="flex-1">
                <p className="text-sm font-medium text-fg">{item.product.name}</p>
                <p className="text-xs text-fg-muted">Ordered: {item.quantity} | Previously received: {item.receivedQuantity}</p>
              </div>
              <input
                type="number"
                min={item.receivedQuantity}
                max={item.quantity}
                value={receiveItems[item.id] ?? item.receivedQuantity}
                onChange={(e) =>
                  setReceiveItems({ ...receiveItems, [item.id]: parseInt(e.target.value) || 0 })
                }
                className="w-20 px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm text-right"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowReceive(false)}>Cancel</Button>
          <Button onClick={handleReceive} loading={receiving}>Confirm Receipt</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This cannot be undone."
        confirmLabel="Cancel Order"
        destructive
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Order"
        message="Are you sure you want to delete this draft order? This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

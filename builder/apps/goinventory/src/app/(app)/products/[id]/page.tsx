import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
    include: {
      category: true,
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      purchaseOrderItems: {
        include: {
          purchaseOrder: { include: { supplier: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const stockLevel =
    product.quantity > product.reorderPoint
      ? "success"
      : product.quantity === product.reorderPoint
      ? "warning"
      : "error";

  const stockLevelLabel =
    stockLevel === "success"
      ? "In Stock"
      : stockLevel === "warning"
      ? "At Reorder Point"
      : "Low Stock";

  const movementTypeBadge = (type: string) => {
    const variants: Record<string, "success" | "info" | "warning" | "neutral" | "error"> = {
      RECEIVED: "success",
      SOLD: "info",
      ADJUSTED: "warning",
      RETURNED: "neutral",
      DAMAGED: "error",
    };
    return variants[type] || "neutral";
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
    <div className="p-6 space-y-6">
      <PageHeader
        title={product.name}
        subtitle={product.sku}
        action={
          <Link href="/products">
            <Button variant="secondary">Back to Products</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Info */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-edge p-5 space-y-4">
          <h2 className="text-lg font-semibold text-fg">Product Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-fg-muted">Category</span>
              <p className="text-fg mt-0.5">
                {product.category ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.category.color }} />
                    {product.category.name}
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <span className="text-fg-muted">Status</span>
              <p className="mt-0.5">
                <Badge variant={product.status === "ACTIVE" ? "success" : "neutral"}>
                  {product.status}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-fg-muted">Unit Price</span>
              <p className="text-fg font-medium mt-0.5">${product.unitPrice.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-fg-muted">Cost Price</span>
              <p className="text-fg mt-0.5">${product.costPrice.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-fg-muted">Unit</span>
              <p className="text-fg mt-0.5">{product.unit}</p>
            </div>
            <div>
              <span className="text-fg-muted">Last Updated</span>
              <p className="text-fg mt-0.5">{new Date(product.updatedAt).toLocaleDateString()}</p>
            </div>
            {product.description && (
              <div className="col-span-2">
                <span className="text-fg-muted">Description</span>
                <p className="text-fg-secondary mt-0.5">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Level Card */}
        <div className="bg-card rounded-xl border border-edge p-5">
          <h2 className="text-lg font-semibold text-fg mb-4">Stock Level</h2>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-fg">{product.quantity}</p>
            <p className="text-sm text-fg-muted mt-1">{product.unit}(s) in stock</p>
            <Badge variant={stockLevel} className="mt-3">
              {stockLevelLabel}
            </Badge>
          </div>
          <div className="mt-4 pt-4 border-t border-edge">
            <div className="flex justify-between text-sm">
              <span className="text-fg-muted">Reorder Point</span>
              <span className="text-fg font-medium">{product.reorderPoint}</span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-elevated rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    stockLevel === "success"
                      ? "bg-status-green"
                      : stockLevel === "warning"
                      ? "bg-status-amber"
                      : "bg-status-red"
                  }`}
                  style={{
                    width: `${Math.min(100, (product.quantity / Math.max(product.reorderPoint * 2, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Movement History */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4">Stock Movement History</h2>
        {product.stockMovements.length === 0 ? (
          <p className="text-sm text-fg-muted py-4">No stock movements recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Type</th>
                  <th className="text-right px-4 py-2 text-fg-muted font-medium">Quantity</th>
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {product.stockMovements.map((m) => (
                  <tr key={m.id} className="border-b border-edge">
                    <td className="px-4 py-2 text-fg-muted">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={movementTypeBadge(m.type)}>{m.type}</Badge>
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${m.quantity > 0 ? "text-status-green-fg" : "text-status-red-fg"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </td>
                    <td className="px-4 py-2 text-fg-secondary">{m.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Order History */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4">Purchase Order History</h2>
        {product.purchaseOrderItems.length === 0 ? (
          <p className="text-sm text-fg-muted py-4">No purchase orders for this product.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Order #</th>
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Supplier</th>
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Status</th>
                  <th className="text-right px-4 py-2 text-fg-muted font-medium">Ordered</th>
                  <th className="text-right px-4 py-2 text-fg-muted font-medium">Received</th>
                  <th className="text-right px-4 py-2 text-fg-muted font-medium">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {product.purchaseOrderItems.map((item) => (
                  <tr key={item.id} className="border-b border-edge">
                    <td className="px-4 py-2">
                      <Link href={`/orders/${item.purchaseOrder.id}`} className="text-accent-fg hover:underline">
                        {item.purchaseOrder.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-fg-secondary">
                      {item.purchaseOrder.supplier.name}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={orderStatusBadge(item.purchaseOrder.status)}>
                        {item.purchaseOrder.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{item.receivedQuantity}</td>
                    <td className="px-4 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

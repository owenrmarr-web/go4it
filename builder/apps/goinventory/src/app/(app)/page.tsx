import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Badge from "@/components/Badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const [
    totalProducts,
    allActiveProducts,
    pendingOrders,
    totalSuppliers,
    recentMovements,
    pendingOrdersList,
  ] = await Promise.all([
    prisma.product.count({ where: { userId, status: "ACTIVE" } }),
    prisma.product.findMany({
      where: { userId, status: "ACTIVE" },
      include: { category: true },
      orderBy: { quantity: "asc" },
    }),
    prisma.purchaseOrder.count({
      where: { userId, status: { in: ["DRAFT", "SUBMITTED"] } },
    }),
    prisma.supplier.count({ where: { userId } }),
    prisma.stockMovement.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.purchaseOrder.findMany({
      where: { userId, status: { in: ["DRAFT", "SUBMITTED"] } },
      include: { supplier: true },
      orderBy: { orderDate: "desc" },
    }),
  ]);

  const lowStock = allActiveProducts.filter(
    (p) => p.quantity <= p.reorderPoint
  );

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-fg">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Total Products</p>
          <p className="text-3xl font-bold text-fg mt-1">{totalProducts}</p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Low Stock Alerts</p>
          <p className="text-3xl font-bold text-status-red-fg mt-1">
            {lowStock.length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Pending Orders</p>
          <p className="text-3xl font-bold text-status-blue-fg mt-1">
            {pendingOrders}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Total Suppliers</p>
          <p className="text-3xl font-bold text-fg mt-1">{totalSuppliers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Low Stock Alerts</h2>
            <Link href="/products" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-fg-muted py-4">All products are well-stocked.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left py-2 text-fg-muted font-medium">Product</th>
                    <th className="text-left py-2 text-fg-muted font-medium">SKU</th>
                    <th className="text-right py-2 text-fg-muted font-medium">Qty</th>
                    <th className="text-right py-2 text-fg-muted font-medium">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 5).map((p) => (
                    <tr key={p.id} className="border-b border-edge">
                      <td className="py-2">
                        <Link href={`/products/${p.id}`} className="text-accent-fg hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 text-fg-muted">{p.sku}</td>
                      <td className="py-2 text-right">
                        <span className="text-status-red-fg font-medium">{p.quantity}</span>
                      </td>
                      <td className="py-2 text-right text-fg-muted">{p.reorderPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Recent Movements</h2>
            <Link href="/movements" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-fg-muted py-4">No stock movements yet.</p>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-edge last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant={movementTypeBadge(m.type)}>{m.type}</Badge>
                    <span className="text-sm text-fg">{m.product.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${m.quantity > 0 ? "text-status-green-fg" : "text-status-red-fg"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </span>
                    <p className="text-xs text-fg-muted">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-edge p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-fg">Pending Orders</h2>
          <Link href="/orders" className="text-sm text-accent-fg hover:underline">
            View all
          </Link>
        </div>
        {pendingOrdersList.length === 0 ? (
          <p className="text-sm text-fg-muted py-4">No pending orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left py-2 text-fg-muted font-medium">Order #</th>
                  <th className="text-left py-2 text-fg-muted font-medium">Supplier</th>
                  <th className="text-left py-2 text-fg-muted font-medium">Status</th>
                  <th className="text-right py-2 text-fg-muted font-medium">Total</th>
                  <th className="text-right py-2 text-fg-muted font-medium">Expected</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrdersList.map((o) => (
                  <tr key={o.id} className="border-b border-edge">
                    <td className="py-2">
                      <Link href={`/orders/${o.id}`} className="text-accent-fg hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2 text-fg-secondary">{o.supplier.name}</td>
                    <td className="py-2">
                      <Badge variant={o.status === "DRAFT" ? "neutral" : "info"}>{o.status}</Badge>
                    </td>
                    <td className="py-2 text-right text-fg">
                      ${o.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right text-fg-muted">
                      {o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : "—"}
                    </td>
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

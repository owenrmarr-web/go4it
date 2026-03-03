import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, userId: session.user.id },
    include: {
      purchaseOrders: {
        orderBy: { orderDate: "desc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });

  if (!supplier) notFound();

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
        title={supplier.name}
        subtitle={supplier.contactName || undefined}
        action={
          <Link href="/suppliers">
            <Button variant="secondary">Back to Suppliers</Button>
          </Link>
        }
      />

      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4">Supplier Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-fg-muted">Contact Name</span>
            <p className="text-fg mt-0.5">{supplier.contactName || "—"}</p>
          </div>
          <div>
            <span className="text-fg-muted">Email</span>
            <p className="text-fg mt-0.5">{supplier.email || "—"}</p>
          </div>
          <div>
            <span className="text-fg-muted">Phone</span>
            <p className="text-fg mt-0.5">{supplier.phone || "—"}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="text-fg-muted">Address</span>
            <p className="text-fg mt-0.5">
              {[supplier.address, supplier.city, supplier.state, supplier.zip]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
          {supplier.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="text-fg-muted">Notes</span>
              <p className="text-fg-secondary mt-0.5">{supplier.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4">Purchase Orders</h2>
        {supplier.purchaseOrders.length === 0 ? (
          <p className="text-sm text-fg-muted py-4">No purchase orders from this supplier.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Order #</th>
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Status</th>
                  <th className="text-left px-4 py-2 text-fg-muted font-medium">Date</th>
                  <th className="text-right px-4 py-2 text-fg-muted font-medium">Items</th>
                  <th className="text-right px-4 py-2 text-fg-muted font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {supplier.purchaseOrders.map((o) => (
                  <tr key={o.id} className="border-b border-edge">
                    <td className="px-4 py-2">
                      <Link href={`/orders/${o.id}`} className="text-accent-fg hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={orderStatusBadge(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-fg-muted">
                      {new Date(o.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">{o._count.items}</td>
                    <td className="px-4 py-2 text-right">
                      ${o.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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

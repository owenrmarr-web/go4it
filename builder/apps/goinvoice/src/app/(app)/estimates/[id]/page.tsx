import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import EstimateDetail from "./EstimateDetail";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      items: true,
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, total: true },
      },
    },
  });

  if (!estimate) notFound();

  const serialized = {
    id: estimate.id,
    estimateNumber: estimate.estimateNumber,
    status: estimate.status,
    issueDate: estimate.issueDate.toISOString(),
    expiresAt: estimate.expiresAt?.toISOString() ?? null,
    subtotal: estimate.subtotal,
    taxRate: estimate.taxRate,
    taxAmount: estimate.taxAmount,
    total: estimate.total,
    notes: estimate.notes,
    client: {
      id: estimate.client.id,
      name: estimate.client.name,
      email: estimate.client.email,
      phone: estimate.client.phone,
      address: estimate.client.address,
      city: estimate.client.city,
      state: estimate.client.state,
      zip: estimate.client.zip,
    },
    items: estimate.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    invoices: estimate.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: inv.total,
    })),
  };

  return <EstimateDetail initialEstimate={serialized} />;
}

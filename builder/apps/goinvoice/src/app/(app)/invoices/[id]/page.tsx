import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import InvoiceDetail from "./InvoiceDetail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      estimate: { select: { id: true, estimateNumber: true } },
    },
  });

  if (!invoice) notFound();

  // Auto-mark overdue
  if (invoice.status === "SENT" && invoice.dueDate < new Date()) {
    await prisma.invoice.update({
      where: { id },
      data: { status: "OVERDUE" },
    });
    invoice.status = "OVERDUE";
  }

  const serialized = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paidDate: invoice.paidDate?.toISOString() ?? null,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    notes: invoice.notes,
    terms: invoice.terms,
    clientId: invoice.clientId,
    client: {
      id: invoice.client.id,
      name: invoice.client.name,
      email: invoice.client.email,
      phone: invoice.client.phone,
      address: invoice.client.address,
      city: invoice.client.city,
      state: invoice.client.state,
      zip: invoice.client.zip,
    },
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentDate: p.paymentDate.toISOString(),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
    })),
    estimate: invoice.estimate
      ? { id: invoice.estimate.id, estimateNumber: invoice.estimate.estimateNumber }
      : null,
  };

  return <InvoiceDetail invoice={serialized} />;
}

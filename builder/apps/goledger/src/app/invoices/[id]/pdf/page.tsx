import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import InvoicePDF from "@/components/InvoicePDF";

export default async function InvoicePDFPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, userId: session.user.id },
      include: {
        client: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.businessSettings.findFirst({
      where: { userId: session.user.id },
    }),
  ]);

  if (!invoice) redirect("/invoices");

  return (
    <InvoicePDF
      invoice={{
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        clientName: invoice.client.name,
        clientEmail: invoice.client.email ?? undefined,
        clientAddress: invoice.client.address ?? undefined,
        clientCity: invoice.client.city ?? undefined,
        clientState: invoice.client.state ?? undefined,
        clientZip: invoice.client.zip ?? undefined,
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.amount,
        })),
        subtotal: invoice.subtotal,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue,
        discountAmount: invoice.discountAmount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        memo: invoice.memo ?? undefined,
        businessName: settings?.businessName,
        businessAddress: settings?.address ?? undefined,
        businessCity: settings?.city ?? undefined,
        businessState: settings?.state ?? undefined,
        businessZip: settings?.zip ?? undefined,
        businessEmail: settings?.email ?? undefined,
        businessPhone: settings?.phone ?? undefined,
      }}
    />
  );
}

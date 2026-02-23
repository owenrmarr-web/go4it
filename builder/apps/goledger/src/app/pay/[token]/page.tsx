import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PayPageClient from "@/components/PayPageClient";

// No auth required — this is the public pay page
export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { viewToken: token },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      user: {
        include: {
          businessSettings: { take: 1 },
        },
      },
    },
  });

  if (!invoice) notFound();

  const settings = invoice.user.businessSettings[0] ?? null;

  const invoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    clientAddress: invoice.client.address,
    clientCity: invoice.client.city,
    clientState: invoice.client.state,
    clientZip: invoice.client.zip,
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
    })),
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    memo: invoice.memo,
    businessName: settings?.businessName ?? "Business",
    businessAddress: settings?.address,
    businessCity: settings?.city,
    businessState: settings?.state,
    businessZip: settings?.zip,
    businessEmail: settings?.email,
    businessPhone: settings?.phone,
    paymentInstructions: settings?.paymentInstructions,
    stripeConfigured: !!(settings?.stripePublishableKey && settings?.stripeSecretKey),
  };

  return <PayPageClient invoice={JSON.parse(JSON.stringify(invoiceData))} token={token} />;
}

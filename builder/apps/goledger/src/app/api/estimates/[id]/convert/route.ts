import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.status === "CONVERTED") {
    return NextResponse.json(
      { error: "Estimate has already been converted" },
      { status: 400 }
    );
  }

  // Generate invoice number
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const prefix = settings?.invoicePrefix || "INV";
  const nextNum = settings?.nextInvoiceNumber || 1001;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  // Calculate due date based on payment terms
  const termDays: Record<string, number> = {
    DUE_ON_RECEIPT: 0,
    NET_15: 15,
    NET_30: 30,
    NET_60: 60,
  };
  const paymentTerms = settings?.defaultPaymentTerms || "NET_30";
  const days = termDays[paymentTerms] ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);

  // Create invoice from estimate
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: estimate.clientId,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate,
      subtotal: estimate.subtotal,
      taxRate: estimate.taxRate,
      taxAmount: estimate.taxAmount,
      total: estimate.total,
      notes: estimate.notes,
      memo: estimate.memo,
      paymentTerms,
      categoryId: estimate.categoryId,
      userId: session.user.id,
      lineItems: {
        create: estimate.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Mark estimate as converted
  await prisma.estimate.update({
    where: { id },
    data: {
      status: "CONVERTED",
      convertedInvoiceId: invoice.id,
    },
  });

  // Increment next invoice number
  if (settings) {
    await prisma.businessSettings.update({
      where: { id: settings.id },
      data: { nextInvoiceNumber: nextNum + 1 },
    });
  }

  return NextResponse.json(invoice, { status: 201 });
}

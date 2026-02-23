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

  const original = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!original) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Generate new invoice number
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const prefix = settings?.invoicePrefix || "INV";
  const nextNum = settings?.nextInvoiceNumber || 1001;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  const duplicate = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: original.clientId,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate: new Date(
        Date.now() +
          (original.dueDate.getTime() - original.issueDate.getTime())
      ),
      subtotal: original.subtotal,
      taxRate: original.taxRate,
      taxAmount: original.taxAmount,
      total: original.total,
      notes: original.notes,
      memo: original.memo,
      poNumber: null,
      paymentTerms: original.paymentTerms,
      categoryId: original.categoryId,
      userId: session.user.id,
      lineItems: {
        create: original.lineItems.map((item) => ({
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

  // Increment next invoice number
  if (settings) {
    await prisma.businessSettings.update({
      where: { id: settings.id },
      data: { nextInvoiceNumber: nextNum + 1 },
    });
  }

  return NextResponse.json(duplicate, { status: 201 });
}

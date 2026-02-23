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

  const recurring = await prisma.recurringInvoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!recurring) {
    return NextResponse.json(
      { error: "Recurring invoice not found" },
      { status: 404 }
    );
  }

  if (!recurring.isActive) {
    return NextResponse.json(
      { error: "Recurring invoice is not active" },
      { status: 400 }
    );
  }

  // Parse template data
  const template = JSON.parse(recurring.templateData) as {
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      sortOrder?: number;
    }>;
    memo?: string;
    notes?: string;
    paymentTerms?: string;
    taxRate?: number;
  };

  // Generate invoice number
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const prefix = settings?.invoicePrefix || "INV";
  const nextNum = settings?.nextInvoiceNumber || 1001;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  const lineItems = template.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxRate = template.taxRate ?? settings?.taxRate ?? 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // Calculate due date
  const termDays: Record<string, number> = {
    DUE_ON_RECEIPT: 0,
    NET_15: 15,
    NET_30: 30,
    NET_60: 60,
  };
  const paymentTerms =
    template.paymentTerms || settings?.defaultPaymentTerms || "NET_30";
  const days = termDays[paymentTerms] ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: recurring.clientId,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: template.notes || null,
      memo: template.memo || null,
      paymentTerms,
      categoryId: recurring.categoryId,
      recurringInvoiceId: recurring.id,
      userId: session.user.id,
      lineItems: {
        create: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Advance nextDate by frequency
  const nextDate = new Date(recurring.nextDate);
  switch (recurring.frequency) {
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "BIWEEKLY":
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "QUARTERLY":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "YEARLY":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  // Check if end date reached
  const shouldDeactivate =
    recurring.endDate && nextDate > recurring.endDate;

  await prisma.recurringInvoice.update({
    where: { id },
    data: {
      nextDate,
      ...(shouldDeactivate && { isActive: false }),
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

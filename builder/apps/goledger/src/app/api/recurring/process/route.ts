import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all active recurring invoices that are due
  const dueRecurring = await prisma.recurringInvoice.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      nextDate: { lte: now },
    },
  });

  if (dueRecurring.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const prefix = settings?.invoicePrefix || "INV";
  let nextNum = settings?.nextInvoiceNumber || 1001;
  const generated: string[] = [];

  const termDays: Record<string, number> = {
    DUE_ON_RECEIPT: 0,
    NET_15: 15,
    NET_30: 30,
    NET_60: 60,
  };

  for (const recurring of dueRecurring) {
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

    const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;
    const lineItems = template.lineItems || [];
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxRate = template.taxRate ?? settings?.taxRate ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const paymentTerms =
      template.paymentTerms || settings?.defaultPaymentTerms || "NET_30";
    const days = termDays[paymentTerms] ?? 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    await prisma.invoice.create({
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
    });

    // Advance nextDate
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

    const shouldDeactivate =
      recurring.endDate && nextDate > recurring.endDate;

    await prisma.recurringInvoice.update({
      where: { id: recurring.id },
      data: {
        nextDate,
        ...(shouldDeactivate && { isActive: false }),
      },
    });

    nextNum++;
    generated.push(invoiceNumber);
  }

  // Update next invoice number
  if (settings) {
    await prisma.businessSettings.update({
      where: { id: settings.id },
      data: { nextInvoiceNumber: nextNum },
    });
  }

  return NextResponse.json({ generated: generated.length, invoices: generated });
}

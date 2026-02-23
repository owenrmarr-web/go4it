import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const q = searchParams.get("q")?.toLowerCase() || "";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status) {
    where.status = status;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (q) {
    const filtered = invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q)
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.clientId || !body.dueDate) {
    return NextResponse.json(
      { error: "clientId and dueDate are required" },
      { status: 400 }
    );
  }

  // Generate invoice number from BusinessSettings
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const prefix = settings?.invoicePrefix || "INV";
  const nextNum = settings?.nextInvoiceNumber || 1001;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  // Calculate totals from line items
  const lineItems = body.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );
  const taxRate = body.taxRate ?? settings?.taxRate ?? 0;

  // Calculate discount
  const discountType = body.discountType || null;
  const discountValue = body.discountValue || 0;
  let discountAmount = 0;
  if (discountType === "PERCENTAGE" && discountValue > 0) {
    discountAmount = subtotal * (discountValue / 100);
  } else if (discountType === "FLAT" && discountValue > 0) {
    discountAmount = discountValue;
  }

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: body.clientId,
      status: body.status || "DRAFT",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: new Date(body.dueDate),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxRate,
      taxAmount,
      total,
      notes: body.notes || null,
      memo: body.memo || null,
      poNumber: body.poNumber || null,
      paymentTerms: body.paymentTerms || settings?.defaultPaymentTerms || "NET_30",
      categoryId: body.categoryId || null,
      userId: session.user.id,
      lineItems: {
        create: lineItems.map(
          (
            item: {
              description: string;
              quantity: number;
              unitPrice: number;
              sortOrder?: number;
            },
            index: number
          ) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            sortOrder: item.sortOrder ?? index,
          })
        ),
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, color: true } },
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

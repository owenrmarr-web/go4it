import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { date: "desc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const body = await request.json();

  // Recalculate totals if line items provided
  let subtotal = existing.subtotal;
  let taxRate = body.taxRate ?? existing.taxRate;
  let taxAmount = existing.taxAmount;
  let total = existing.total;

  if (body.lineItems) {
    // Delete existing line items and create new ones
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

    subtotal = body.lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );
    taxAmount = subtotal * (taxRate / 100);
    total = subtotal + taxAmount;
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.issueDate !== undefined && {
        issueDate: new Date(body.issueDate),
      }),
      ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      subtotal,
      taxRate,
      taxAmount,
      total,
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.memo !== undefined && { memo: body.memo }),
      ...(body.poNumber !== undefined && { poNumber: body.poNumber }),
      ...(body.paymentTerms !== undefined && {
        paymentTerms: body.paymentTerms,
      }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.lineItems && {
        lineItems: {
          create: body.lineItems.map(
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
      }),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { date: "desc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await prisma.invoice.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

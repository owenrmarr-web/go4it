import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      items: true,
      payments: { orderBy: { paymentDate: "desc" } },
      estimate: { select: { id: true, estimateNumber: true } },
    },
  });

  if (!invoice)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-mark overdue
  if (invoice.status === "SENT" && invoice.dueDate < new Date()) {
    await prisma.invoice.update({
      where: { id },
      data: { status: "OVERDUE" },
    });
    invoice.status = "OVERDUE";
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle status updates
  if (body.status) {
    const data: Record<string, unknown> = { status: body.status };
    if (body.status === "PAID") data.paidDate = new Date();
    const invoice = await prisma.invoice.update({ where: { id }, data });
    return NextResponse.json(invoice);
  }

  // Full update (only DRAFT invoices)
  if (existing.status !== "DRAFT")
    return NextResponse.json(
      { error: "Only draft invoices can be edited" },
      { status: 400 }
    );

  // Delete existing items and recreate
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

  const items = body.items || [];
  const subtotal = items.reduce(
    (s: number, i: { quantity: number; unitPrice: number }) =>
      s + i.quantity * i.unitPrice,
    0
  );
  const taxRate = body.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      clientId: body.clientId,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: body.notes || null,
      terms: body.terms || null,
      items: {
        create: items.map(
          (item: {
            description: string;
            quantity: number;
            unitPrice: number;
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            userId: session.user.id,
          })
        ),
      },
    },
    include: { items: true, client: true },
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "DRAFT")
    return NextResponse.json(
      { error: "Only draft invoices can be deleted" },
      { status: 400 }
    );

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

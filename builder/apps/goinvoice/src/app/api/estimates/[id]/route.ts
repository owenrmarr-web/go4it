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
  const estimate = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      items: true,
      invoices: { select: { id: true, invoiceNumber: true, status: true } },
    },
  });

  if (!estimate)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(estimate);
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

  const existing = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Status-only update
  if (body.status && Object.keys(body).length === 1) {
    const estimate = await prisma.estimate.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(estimate);
  }

  if (existing.status !== "DRAFT")
    return NextResponse.json(
      { error: "Only draft estimates can be edited" },
      { status: 400 }
    );

  await prisma.estimateItem.deleteMany({ where: { estimateId: id } });

  const items = body.items || [];
  const subtotal = items.reduce(
    (s: number, i: { quantity: number; unitPrice: number }) =>
      s + i.quantity * i.unitPrice,
    0
  );
  const taxRate = body.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const estimate = await prisma.estimate.update({
    where: { id },
    data: {
      clientId: body.clientId,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: body.notes || null,
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

  return NextResponse.json(estimate);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "DRAFT")
    return NextResponse.json(
      { error: "Only draft estimates can be deleted" },
      { status: 400 }
    );

  await prisma.estimate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

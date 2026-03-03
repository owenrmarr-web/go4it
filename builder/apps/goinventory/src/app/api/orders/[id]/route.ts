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

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, userId: session.user.id },
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
  });

  if (!order)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(order);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await request.json();

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "DRAFT")
    return NextResponse.json(
      { error: "Can only edit orders in DRAFT status" },
      { status: 400 }
    );

  // Delete existing items and re-create
  await prisma.purchaseOrderItem.deleteMany({
    where: { purchaseOrderId: id },
  });

  const totalAmount = (data.items as Array<{ quantity: number; unitPrice: number }>).reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      supplierId: data.supplierId,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes || null,
      totalAmount,
      items: {
        create: (data.items as Array<{ productId: string; quantity: number; unitPrice: number }>).map(
          (item: { productId: string; quantity: number; unitPrice: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            userId: session.user!.id!,
          })
        ),
      },
    },
    include: { supplier: true, items: { include: { product: true } } },
  });

  return NextResponse.json(order);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "DRAFT")
    return NextResponse.json(
      { error: "Can only delete orders in DRAFT status" },
      { status: 400 }
    );

  await prisma.purchaseOrder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

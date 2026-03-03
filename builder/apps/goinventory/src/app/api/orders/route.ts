import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status) where.status = status;

  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: true,
      _count: { select: { items: true } },
    },
    orderBy: { orderDate: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  // Auto-generate order number
  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  let nextNum = 1;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/PO-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const orderNumber = `PO-${String(nextNum).padStart(3, "0")}`;

  const totalAmount = (data.items as Array<{ quantity: number; unitPrice: number }>).reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      status: "DRAFT",
      supplierId: data.supplierId,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes || null,
      totalAmount,
      userId: session.user.id,
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

  return NextResponse.json(order, { status: 201 });
}

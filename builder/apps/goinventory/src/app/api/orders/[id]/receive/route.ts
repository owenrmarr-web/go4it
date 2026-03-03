import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { items } = await request.json() as {
    items: Array<{ itemId: string; receivedQuantity: number }>;
  };

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  });

  if (!order)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["SUBMITTED", "PARTIALLY_RECEIVED"].includes(order.status))
    return NextResponse.json(
      { error: "Order must be SUBMITTED or PARTIALLY_RECEIVED to receive items" },
      { status: 400 }
    );

  // Process each item
  for (const received of items) {
    const orderItem = order.items.find((i) => i.id === received.itemId);
    if (!orderItem) continue;

    const newReceived = received.receivedQuantity;
    const delta = newReceived - orderItem.receivedQuantity;

    if (delta <= 0) continue;

    await prisma.$transaction([
      prisma.purchaseOrderItem.update({
        where: { id: orderItem.id },
        data: { receivedQuantity: newReceived },
      }),
      prisma.product.update({
        where: { id: orderItem.productId },
        data: { quantity: { increment: delta } },
      }),
      prisma.stockMovement.create({
        data: {
          type: "RECEIVED",
          quantity: delta,
          notes: `Received from ${order.orderNumber}`,
          productId: orderItem.productId,
          referenceId: order.id,
          userId: session.user!.id!,
        },
      }),
    ]);
  }

  // Check if all items are fully received
  const updatedItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: id },
  });

  const allReceived = updatedItems.every(
    (item) => item.receivedQuantity >= item.quantity
  );
  const someReceived = updatedItems.some((item) => item.receivedQuantity > 0);

  let newStatus = order.status;
  if (allReceived) {
    newStatus = "RECEIVED";
  } else if (someReceived) {
    newStatus = "PARTIALLY_RECEIVED";
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: newStatus,
      receivedDate: allReceived ? new Date() : null,
    },
    include: { supplier: true, items: { include: { product: true } } },
  });

  return NextResponse.json(updated);
}

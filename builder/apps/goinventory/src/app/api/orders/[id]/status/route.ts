import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!order)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const validTransitions: Record<string, string[]> = {
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["CANCELLED"],
  };

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${status}` },
      { status: 400 }
    );
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status },
    include: { supplier: true, items: { include: { product: true } } },
  });

  return NextResponse.json(updated);
}

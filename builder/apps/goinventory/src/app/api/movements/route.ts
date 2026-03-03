import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (type) where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59");
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    include: { product: true, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(movements);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const qty = parseInt(data.quantity);
  const adjustedQty = ["SOLD", "DAMAGED"].includes(data.type)
    ? -Math.abs(qty)
    : data.type === "ADJUSTED"
    ? qty
    : Math.abs(qty);

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type: data.type,
        quantity: adjustedQty,
        notes: data.notes || null,
        productId: data.productId,
        referenceId: data.referenceId || null,
        userId: session.user.id,
      },
      include: { product: true },
    }),
    prisma.product.update({
      where: { id: data.productId },
      data: { quantity: { increment: adjustedQty } },
    }),
  ]);

  return NextResponse.json(movement, { status: 201 });
}

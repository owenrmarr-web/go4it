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

  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
    include: {
      category: true,
      stockMovements: { orderBy: { createdAt: "desc" } },
      purchaseOrderItems: {
        include: { purchaseOrder: { include: { supplier: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product);
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

  const product = await prisma.product.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: data.name,
      sku: data.sku,
      description: data.description || null,
      unitPrice: parseFloat(data.unitPrice) || 0,
      costPrice: parseFloat(data.costPrice) || 0,
      reorderPoint: parseInt(data.reorderPoint) || 0,
      unit: data.unit || "each",
      status: data.status || "ACTIVE",
      categoryId: data.categoryId || null,
      imageUrl: data.imageUrl || null,
    },
  });

  if (product.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
    include: { category: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await prisma.product.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

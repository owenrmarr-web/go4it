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
  const data = await request.json();

  const result = await prisma.category.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: data.name,
      description: data.description || null,
      color: data.color || "#6366f1",
    },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.category.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { products: true } } },
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

  const productCount = await prisma.product.count({
    where: { categoryId: id, userId: session.user.id },
  });

  if (productCount > 0) {
    return NextResponse.json(
      { error: `Category has ${productCount} product(s). Reassign them before deleting.` },
      { status: 400 }
    );
  }

  const result = await prisma.category.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

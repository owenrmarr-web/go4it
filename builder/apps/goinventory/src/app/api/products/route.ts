import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const categoryId = url.searchParams.get("categoryId") || "";
  const status = url.searchParams.get("status") || "";
  const sort = url.searchParams.get("sort") || "updatedAt";
  const order = url.searchParams.get("order") || "desc";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { [sort]: order },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      description: data.description || null,
      unitPrice: parseFloat(data.unitPrice) || 0,
      costPrice: parseFloat(data.costPrice) || 0,
      quantity: parseInt(data.quantity) || 0,
      reorderPoint: parseInt(data.reorderPoint) || 0,
      unit: data.unit || "each",
      status: data.status || "ACTIVE",
      categoryId: data.categoryId || null,
      imageUrl: data.imageUrl || null,
      userId: session.user.id,
    },
    include: { category: true },
  });

  return NextResponse.json(product, { status: 201 });
}

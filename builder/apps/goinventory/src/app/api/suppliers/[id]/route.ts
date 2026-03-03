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

  const supplier = await prisma.supplier.findFirst({
    where: { id, userId: session.user.id },
    include: {
      purchaseOrders: {
        orderBy: { orderDate: "desc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });

  if (!supplier)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(supplier);
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

  const result = await prisma.supplier.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      notes: data.notes || null,
    },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.supplier.findFirst({
    where: { id, userId: session.user.id },
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

  const result = await prisma.supplier.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

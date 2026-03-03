import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const suppliers = await prisma.supplier.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { purchaseOrders: true } },
      purchaseOrders: {
        orderBy: { orderDate: "desc" },
        take: 1,
        select: { orderDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  const supplier = await prisma.supplier.create({
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
      userId: session.user.id,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}

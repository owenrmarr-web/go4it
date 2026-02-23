import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (isActive !== null) {
    where.isActive = isActive === "true";
  }

  const recurring = await prisma.recurringInvoice.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, color: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
    orderBy: { nextDate: "asc" },
  });

  return NextResponse.json(recurring);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.clientId || !body.frequency || !body.nextDate || !body.templateData) {
    return NextResponse.json(
      { error: "clientId, frequency, nextDate, and templateData are required" },
      { status: 400 }
    );
  }

  const recurring = await prisma.recurringInvoice.create({
    data: {
      clientId: body.clientId,
      frequency: body.frequency,
      nextDate: new Date(body.nextDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive ?? true,
      templateData:
        typeof body.templateData === "string"
          ? body.templateData
          : JSON.stringify(body.templateData),
      categoryId: body.categoryId || null,
      userId: session.user.id,
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(recurring, { status: 201 });
}

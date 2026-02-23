import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const recurring = await prisma.recurringInvoice.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, color: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          amountPaid: true,
          createdAt: true,
        },
      },
    },
  });

  if (!recurring) {
    return NextResponse.json(
      { error: "Recurring invoice not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(recurring);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.recurringInvoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Recurring invoice not found" },
      { status: 404 }
    );
  }

  const body = await request.json();

  const recurring = await prisma.recurringInvoice.update({
    where: { id },
    data: {
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.frequency !== undefined && { frequency: body.frequency }),
      ...(body.nextDate !== undefined && {
        nextDate: new Date(body.nextDate),
      }),
      ...(body.endDate !== undefined && {
        endDate: body.endDate ? new Date(body.endDate) : null,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.templateData !== undefined && {
        templateData:
          typeof body.templateData === "string"
            ? body.templateData
            : JSON.stringify(body.templateData),
      }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(recurring);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.recurringInvoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Recurring invoice not found" },
      { status: 404 }
    );
  }

  await prisma.recurringInvoice.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

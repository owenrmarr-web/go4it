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

  const expense = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
    include: {
      category: { select: { id: true, name: true, color: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json(expense);
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

  const existing = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const body = await request.json();

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.vendor !== undefined && { vendor: body.vendor }),
      ...(body.method !== undefined && { method: body.method }),
      ...(body.reference !== undefined && { reference: body.reference }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.isBillable !== undefined && { isBillable: body.isBillable }),
      ...(body.isReimbursable !== undefined && {
        isReimbursable: body.isReimbursable,
      }),
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(expense);
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

  const existing = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

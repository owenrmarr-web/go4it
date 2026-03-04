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
  const body = await request.json();

  const existing = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : undefined,
      category: body.category || "GENERAL",
      vendor: body.vendor || null,
      reference: body.reference || null,
      notes: body.notes || null,
      isReimbursable: body.isReimbursable ?? false,
      isReimbursed: body.isReimbursed ?? false,
    },
  });

  return NextResponse.json(expense);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

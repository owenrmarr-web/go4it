import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      (where.date as Record<string, unknown>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.date as Record<string, unknown>).lte = new Date(endDate);
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, color: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.description || body.amount === undefined) {
    return NextResponse.json(
      { error: "description and amount are required" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      categoryId: body.categoryId || null,
      clientId: body.clientId || null,
      vendor: body.vendor || null,
      method: body.method || null,
      reference: body.reference || null,
      notes: body.notes || null,
      isBillable: body.isBillable || false,
      isReimbursable: body.isReimbursable || false,
      userId: session.user.id,
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

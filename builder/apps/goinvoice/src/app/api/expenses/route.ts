import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (category && category !== "ALL") where.category = category;
  if (search) {
    where.OR = [
      { description: { contains: search } },
      { vendor: { contains: search } },
    ];
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const expense = await prisma.expense.create({
    data: {
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      category: body.category || "GENERAL",
      vendor: body.vendor || null,
      reference: body.reference || null,
      notes: body.notes || null,
      isReimbursable: body.isReimbursable || false,
      isReimbursed: body.isReimbursed || false,
      userId: session.user.id,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

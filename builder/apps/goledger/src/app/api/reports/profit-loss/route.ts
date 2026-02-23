import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Income = sum of paid invoice totals in range
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      status: "PAID",
      paidAt: { gte: start, lte: end },
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
  });

  const income = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Group income by category
  const incomeByCategoryMap = new Map<
    string,
    { categoryId: string | null; categoryName: string; total: number }
  >();
  for (const inv of paidInvoices) {
    const key = inv.categoryId || "uncategorized";
    const existing = incomeByCategoryMap.get(key);
    if (existing) {
      existing.total += inv.total;
    } else {
      incomeByCategoryMap.set(key, {
        categoryId: inv.categoryId,
        categoryName: inv.category?.name || "Uncategorized",
        total: inv.total,
      });
    }
  }

  // Expenses in range
  const expenseRecords = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      date: { gte: start, lte: end },
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
  });

  const expenses = expenseRecords.reduce((sum, exp) => sum + exp.amount, 0);

  // Group expenses by category
  const expensesByCategoryMap = new Map<
    string,
    { categoryId: string | null; categoryName: string; total: number }
  >();
  for (const exp of expenseRecords) {
    const key = exp.categoryId || "uncategorized";
    const existing = expensesByCategoryMap.get(key);
    if (existing) {
      existing.total += exp.amount;
    } else {
      expensesByCategoryMap.set(key, {
        categoryId: exp.categoryId,
        categoryName: exp.category?.name || "Uncategorized",
        total: exp.amount,
      });
    }
  }

  return NextResponse.json({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    income,
    expenses,
    net: income - expenses,
    incomeByCategory: Array.from(incomeByCategoryMap.values()).map((c) => ({
      name: c.categoryName,
      total: c.total,
    })),
    expensesByCategory: Array.from(expensesByCategoryMap.values()).map((c) => ({
      name: c.categoryName,
      total: c.total,
    })),
  });
}

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

  const expenses = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      date: { gte: start, lte: end },
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: "desc" },
  });

  // Group by category
  const byCategoryMap = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      color: string | null;
      total: number;
      count: number;
    }
  >();

  for (const exp of expenses) {
    const key = exp.categoryId || "uncategorized";
    const existing = byCategoryMap.get(key);
    if (existing) {
      existing.total += exp.amount;
      existing.count++;
    } else {
      byCategoryMap.set(key, {
        categoryId: exp.categoryId,
        categoryName: exp.category?.name || "Uncategorized",
        color: exp.category?.color || null,
        total: exp.amount,
        count: 1,
      });
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categories = Array.from(byCategoryMap.values())
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      name: c.categoryName,
      total: c.total,
      count: c.count,
      percentage: totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0,
    }));

  return NextResponse.json({
    total: totalExpenses,
    categories,
  });
}

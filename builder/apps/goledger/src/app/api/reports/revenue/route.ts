import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const months = parseInt(searchParams.get("months") || "6", 10);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  // Get all paid invoices in range
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      status: "PAID",
      paidAt: { gte: startDate },
    },
  });

  // Get all expenses in range
  const expenseRecords = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate },
    },
  });

  // Build monthly data with both revenue and expenses
  const result: Array<{ month: string; revenue: number; expenses: number }> = [];

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const monthNum = d.getMonth();
    const year = d.getFullYear();
    const monthName = d.toLocaleString("default", { month: "short" });

    const monthRevenue = paidInvoices
      .filter((inv) => {
        const paidDate = inv.paidAt ? new Date(inv.paidAt) : null;
        return paidDate && paidDate.getMonth() === monthNum && paidDate.getFullYear() === year;
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthExpenses = expenseRecords
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === monthNum && expDate.getFullYear() === year;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    result.push({
      month: `${monthName} ${year}`,
      revenue: monthRevenue,
      expenses: monthExpenses,
    });
  }

  return NextResponse.json(result);
}

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

  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const [invoices, payments, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { clientId: id, userId: session.user.id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { clientId: id, userId: session.user.id },
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
      },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { clientId: id, userId: session.user.id },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    client,
    invoices,
    payments,
    expenses,
    summary: {
      totalInvoiced: invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      outstandingBalance: invoices.reduce(
        (sum, inv) => sum + (inv.total - inv.amountPaid),
        0
      ),
    },
  });
}

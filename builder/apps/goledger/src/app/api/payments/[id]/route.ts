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

  const payment = await prisma.payment.findFirst({
    where: { id, userId: session.user.id },
    include: {
      invoice: {
        select: { id: true, invoiceNumber: true, total: true, status: true },
      },
      client: { select: { id: true, name: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(payment);
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

  const payment = await prisma.payment.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Delete payment
  await prisma.payment.delete({ where: { id } });

  // Recalculate invoice amountPaid
  const remainingPayments = await prisma.payment.findMany({
    where: { invoiceId: payment.invoiceId },
  });

  const newAmountPaid = remainingPayments.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  const invoice = await prisma.invoice.findUnique({
    where: { id: payment.invoiceId },
  });

  if (invoice) {
    let newStatus = invoice.status;
    if (newAmountPaid <= 0) {
      newStatus = "SENT";
    } else if (newAmountPaid < invoice.total) {
      newStatus = "PARTIAL";
    }

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus,
        ...(newStatus !== "PAID" && { paidAt: null }),
      },
    });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const invoiceId = searchParams.get("invoiceId");
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (invoiceId) {
    where.invoiceId = invoiceId;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: {
        select: { id: true, invoiceNumber: true, total: true, status: true },
      },
      client: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.invoiceId || !body.amount || !body.method) {
    return NextResponse.json(
      { error: "invoiceId, amount, and method are required" },
      { status: 400 }
    );
  }

  // Verify invoice belongs to user
  const invoice = await prisma.invoice.findFirst({
    where: { id: body.invoiceId, userId: session.user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      invoiceId: body.invoiceId,
      clientId: invoice.clientId,
      amount: body.amount,
      method: body.method,
      reference: body.reference || null,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes || null,
      userId: session.user.id,
    },
    include: {
      invoice: {
        select: { id: true, invoiceNumber: true, total: true, status: true },
      },
      client: { select: { id: true, name: true } },
    },
  });

  // Update invoice amountPaid and status
  const newAmountPaid = invoice.amountPaid + body.amount;
  const newStatus =
    newAmountPaid >= invoice.total ? "PAID" : "PARTIAL";

  await prisma.invoice.update({
    where: { id: body.invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
      ...(newStatus === "PAID" && { paidAt: new Date() }),
    },
  });

  return NextResponse.json(payment, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const method = searchParams.get("method");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (method && method !== "ALL") where.method = method;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const invoice = await prisma.invoice.findFirst({
    where: { id: body.invoiceId, userId: session.user.id },
  });
  if (!invoice)
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const payment = await prisma.payment.create({
    data: {
      amount: body.amount,
      paymentDate: body.paymentDate
        ? new Date(body.paymentDate)
        : new Date(),
      method: body.method || "OTHER",
      reference: body.reference || null,
      notes: body.notes || null,
      invoiceId: body.invoiceId,
      userId: session.user.id,
    },
  });

  // Update invoice amountPaid and status
  const newAmountPaid = invoice.amountPaid + body.amount;
  const newStatus = newAmountPaid >= invoice.total ? "PAID" : invoice.status;

  await prisma.invoice.update({
    where: { id: body.invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
      ...(newStatus === "PAID" ? { paidDate: new Date() } : {}),
    },
  });

  return NextResponse.json(payment, { status: 201 });
}

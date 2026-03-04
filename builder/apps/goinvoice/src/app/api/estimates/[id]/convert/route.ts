import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const estimate = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  });

  if (!estimate)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (estimate.status !== "SENT" && estimate.status !== "DRAFT")
    return NextResponse.json(
      { error: "Only draft or sent estimates can be converted" },
      { status: 400 }
    );

  // Generate invoice number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const invoiceNumber = `INV-${String(nextNum).padStart(3, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: estimate.clientId,
      status: "DRAFT",
      dueDate,
      subtotal: estimate.subtotal,
      taxRate: estimate.taxRate,
      taxAmount: estimate.taxAmount,
      total: estimate.total,
      notes: estimate.notes,
      estimateId: estimate.id,
      userId: session.user.id,
      items: {
        create: estimate.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          userId: session.user.id,
        })),
      },
    },
    include: { items: true, client: true },
  });

  // Mark estimate as accepted
  await prisma.estimate.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });

  return NextResponse.json(invoice, { status: 201 });
}

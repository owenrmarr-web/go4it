import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { client: { name: { contains: search } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  // Auto-mark overdue
  const now = new Date();
  for (const inv of invoices) {
    if (inv.status === "SENT" && inv.dueDate < now) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "OVERDUE" },
      });
      inv.status = "OVERDUE";
    }
  }

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

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

  const items = body.items || [];
  const subtotal = items.reduce(
    (s: number, i: { quantity: number; unitPrice: number }) =>
      s + i.quantity * i.unitPrice,
    0
  );
  const taxRate = body.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: body.clientId,
      status: "DRAFT",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: new Date(body.dueDate),
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: body.notes || null,
      terms: body.terms || null,
      estimateId: body.estimateId || null,
      userId: session.user.id,
      items: {
        create: items.map(
          (item: {
            description: string;
            quantity: number;
            unitPrice: number;
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            userId: session.user.id,
          })
        ),
      },
    },
    include: { items: true, client: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}

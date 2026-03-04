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
      { estimateNumber: { contains: search } },
      { client: { name: { contains: search } } },
    ];
  }

  const estimates = await prisma.estimate.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  // Auto-expire
  const now = new Date();
  for (const est of estimates) {
    if (est.status === "SENT" && est.expiresAt && est.expiresAt < now) {
      await prisma.estimate.update({
        where: { id: est.id },
        data: { status: "EXPIRED" },
      });
      est.status = "EXPIRED";
    }
  }

  return NextResponse.json(estimates);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const lastEstimate = await prisma.estimate.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { estimateNumber: true },
  });

  let nextNum = 1;
  if (lastEstimate) {
    const match = lastEstimate.estimateNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const estimateNumber = `EST-${String(nextNum).padStart(3, "0")}`;

  const items = body.items || [];
  const subtotal = items.reduce(
    (s: number, i: { quantity: number; unitPrice: number }) =>
      s + i.quantity * i.unitPrice,
    0
  );
  const taxRate = body.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber,
      clientId: body.clientId,
      status: "DRAFT",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: body.notes || null,
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

  return NextResponse.json(estimate, { status: 201 });
}

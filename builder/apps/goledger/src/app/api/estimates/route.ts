import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status) {
    where.status = status;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  const estimates = await prisma.estimate.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(estimates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 }
    );
  }

  // Generate estimate number from BusinessSettings
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const prefix = settings?.estimatePrefix || "EST";
  const nextNum = settings?.nextEstimateNumber || 1;
  const estimateNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  const lineItems = body.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );
  const taxRate = body.taxRate ?? settings?.taxRate ?? 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber,
      clientId: body.clientId,
      status: body.status || "DRAFT",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: body.notes || null,
      memo: body.memo || null,
      categoryId: body.categoryId || null,
      userId: session.user.id,
      lineItems: {
        create: lineItems.map(
          (
            item: {
              description: string;
              quantity: number;
              unitPrice: number;
              sortOrder?: number;
            },
            index: number
          ) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            sortOrder: item.sortOrder ?? index,
          })
        ),
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  // Increment next estimate number
  if (settings) {
    await prisma.businessSettings.update({
      where: { id: settings.id },
      data: { nextEstimateNumber: nextNum + 1 },
    });
  }

  return NextResponse.json(estimate, { status: 201 });
}

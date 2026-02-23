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

  const estimate = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  return NextResponse.json(estimate);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const body = await request.json();

  let subtotal = existing.subtotal;
  let taxRate = body.taxRate ?? existing.taxRate;
  let taxAmount = existing.taxAmount;
  let total = existing.total;

  if (body.lineItems) {
    await prisma.estimateLineItem.deleteMany({ where: { estimateId: id } });

    subtotal = body.lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );
    taxAmount = subtotal * (taxRate / 100);
    total = subtotal + taxAmount;
  }

  const estimate = await prisma.estimate.update({
    where: { id },
    data: {
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.issueDate !== undefined && {
        issueDate: new Date(body.issueDate),
      }),
      ...(body.expiresAt !== undefined && {
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      }),
      subtotal,
      taxRate,
      taxAmount,
      total,
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.memo !== undefined && { memo: body.memo }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.lineItems && {
        lineItems: {
          create: body.lineItems.map(
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
      }),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(estimate);
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

  const existing = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  await prisma.estimate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

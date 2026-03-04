import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    include: {
      invoices: {
        include: { items: true },
        orderBy: { issueDate: "desc" },
      },
      estimates: {
        include: { items: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!client)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(client);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    include: { invoices: { select: { id: true } } },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.invoices.length > 0)
    return NextResponse.json(
      { error: "Cannot delete client with existing invoices" },
      { status: 400 }
    );

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

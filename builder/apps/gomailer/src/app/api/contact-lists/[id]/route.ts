import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const list = await prisma.contactList.findFirst({
    where: { id, userId: session.user.id },
    include: {
      subscribers: { orderBy: { createdAt: "desc" } },
      _count: { select: { subscribers: true, campaigns: true } },
    },
  });
  if (!list)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(list);
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
  const list = await prisma.contactList.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: body.name,
      description: body.description,
      color: body.color,
    },
  });
  if (list.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contactList.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const list = await prisma.contactList.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { subscribers: true } } },
  });
  if (!list)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
